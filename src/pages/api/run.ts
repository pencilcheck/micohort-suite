// api/run.js
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifySignature } from "@upstash/qstash/nextjs";
import edgeChromium from 'chrome-aws-lambda'
import { MicpaPerson, PrismaClient } from '@prisma/client'

// Importing Puppeteer core as default otherwise
// it won't function correctly with "launch()"
import puppeteer from 'puppeteer-core'
import dayjs from 'dayjs';

import { LoginLinkedin, SearchPeople, ScrapePages, TokenizeDoc, ParseData, GetFields } from '../../utils/puppeteer';

// You may want to change this if you're developing
// on a platform different from macOS.
// See https://github.com/vercel/og-image for a more resilient
// system-agnostic options for Puppeteeer.
const LOCAL_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const prisma = new PrismaClient()

async function puppeteerHandler(persons: MicpaPerson[]) {
  // Edge executable will return an empty string locally.
  const executablePath = await edgeChromium.executablePath || LOCAL_CHROME_EXECUTABLE

  const browser = await puppeteer.launch({
    executablePath,
    args: edgeChromium.args,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await LoginLinkedin(page)
    for (const person of persons) {
      const hrefs = await SearchPeople(page, person)
      const docs = await ScrapePages(page, hrefs)
      const tokenizedDocs = docs.map((data) => {
        return TokenizeDoc(ParseData(data));
      })

      await prisma.micpaLinkedinPerson.createMany({
        data: tokenizedDocs.map(doc => ({
          information: doc,
          micpaPersonId: person.id,
        })),
        skipDuplicates: true,
      })

      break; // one person per API call
    }
  } catch (e) {
    console.log(e)
  } finally {
    await browser.close();
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // return persons who either hasn't scraped yet, or scraped more than 6 months ago
  const persons = await prisma.micpaPerson.findMany({
    where: {
      OR: [
        {
          linkedinPersons: {
            none: {}
          },
        },
        {
          scrapedAt: {
            lte: dayjs().subtract(6, 'months').format()
          }
        }
      ]
    }
  })

  await puppeteerHandler(persons);

  res.send({ status: 'OK' })
}

/*
// for local testing
export default handler;
*/

export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
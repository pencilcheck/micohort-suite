// api/scrape.js
import type { NextApiRequest, NextApiResponse } from 'next'
import edgeChromium from 'chrome-aws-lambda'

// Importing Puppeteer core as default otherwise
// it won't function correctly with "launch()"
import puppeteer from 'puppeteer-core'

import { LoginLinkedin, SearchPeople, ScrapePages, TokenizeDoc, ParseData, GetFields } from '../../utils/puppeteer';

// You may want to change this if you're developing
// on a platform different from macOS.
// See https://github.com/vercel/og-image for a more resilient
// system-agnostic options for Puppeteeer.
const LOCAL_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

type Person = { name: string, id: string }

async function puppeteerHandler(persons: Person[]) {
  // Edge executable will return an empty string locally.
  const executablePath = await edgeChromium.executablePath || LOCAL_CHROME_EXECUTABLE

  const browser = await puppeteer.launch({
    executablePath,
    args: edgeChromium.args,
    headless: true,
  })
  
  const result = [];

  try {
    const page = await browser.newPage()
    await LoginLinkedin(page)
    for (const person of persons) {
      console.log("scraping person", person)
      const hrefs = await SearchPeople(page, person.name)
      const docs = await ScrapePages(page, hrefs)
      const tokenizedDocs = docs.map((data) => ({ ...TokenizeDoc(ParseData(data)), personId: person.id }))
      
      result.push(tokenizedDocs);
    }
  } catch (e) {
    console.log(e)
  } finally {
    await browser.close();
  }
  
  return result;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const persons = JSON.parse(req.body)
  const result = await puppeteerHandler(persons);
  res.send({ status: 'OK', data: result })
}

export default handler;
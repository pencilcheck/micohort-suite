// api/scrape.js
import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, type Prisma, type MicpaLinkedinPerson } from '@prisma/client'
import dayjs from 'dayjs';

import { scrapeProfiles, type PrepDocType } from '../../utils/puppeteer';

const prisma = new PrismaClient()

// We have 15 mins timeout, we need to breakup our procedures so it fits (puppeteer is very slow)
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const linkedinPersons = await prisma.micpaLinkedinPerson.findMany({
      where: {
        OR: [
          {
            scrapedAt: {
              equals: null
            },
          },
          {
            scrapedAt: {
              lte: dayjs().subtract(6, 'months').format()
            }
          }
        ]
      },
      take: 1,
    });

    // chunking
    const prepDocs = linkedinPersons
      .filter<MicpaLinkedinPerson>((i): i is MicpaLinkedinPerson => !!(i?.information as PrepDocType)?.personId && !!(i?.information as PrepDocType)?.profile_url)
      .map<PrepDocType>(p => p.information as PrepDocType);

    // delete incompatible records
    const incompatibleLinkedinPersons = linkedinPersons
      .filter<MicpaLinkedinPerson>((i): i is MicpaLinkedinPerson => !(i?.information as PrepDocType)?.personId || !(i?.information as PrepDocType)?.profile_url)
    await Promise.all(incompatibleLinkedinPersons.map(async (p) => {
      await prisma.micpaLinkedinPerson.delete({
        where: {
          id: p.id,
        },
      });
    }));

    const documents = await scrapeProfiles(prepDocs);

    if (documents) {
      for (const docu of documents) {
        const linkedinPersonId = linkedinPersons.find(p => p?.micpaPersonId === docu.personId)?.id
        if (linkedinPersonId) {
          await prisma.micpaLinkedinPerson.update({
            data: {
              information: docu as Prisma.InputJsonValue,
              scrapedAt: dayjs().format(),
            },
            where: {
              id: linkedinPersonId,
            },
          });
        }
      }
    } else {
      // could be timed out, try again later
      return res.send({ status: 'BLOCK', message: 'Potential Linkedin security block' })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    res.send({ status: 'Error', body: (req.body as Buffer).toString(), error: message })
  }

  res.send({ status: 'OK' })
}

export default handler;
// api/run.js
import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs';

import { findProfilesV2 } from '../../utils/puppeteer';

const prisma = new PrismaClient()

// We have 15 mins timeout, we need to breakup our procedures so it fits (puppeteer is very slow)
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // return persons who either hasn't scraped yet, or scraped more than 6 months ago
  const persons = await prisma.micpaPerson.findMany({
    where: {
      AND: [
        {
          scrapedAt: {
            equals: null
          },
        },
        {
          OR: [
            {
              linkedinPersons: {
                none: {}
              },
            },
            {
              linkedinPersons: {
                some: {
                  createdAt: {
                    lte: dayjs().subtract(6, 'months').format()
                  }
                }
              },
            }
          ]
        }
      ]
    },
    take: 1 // 1 person to avoid timeout (let's test it out)
  })
  
  for (const person of persons) {
    try {
      // only get profile_url in the Profile DocType object to speed things up
      const infoDocs = await findProfilesV2(person);
      
      if (infoDocs) {
        // reset since they might be outdated
        await prisma.micpaLinkedinPerson.deleteMany({
          where: {
            micpaPersonId: person.id
          }
        });

        await prisma.micpaLinkedinPerson.createMany({
          data: infoDocs.map(doc => ({
            information: doc,
            micpaPersonId: person.id,
          })),
          skipDuplicates: true,
        });

        await prisma.micpaPerson.update({
          data: {
            scrapedAt: dayjs().format()
          },
          where: {
            id: person.id
          }
        });
      } else {
        // could be timed out, try again later
        return res.send({ status: 'BLOCK', message: 'Potential Linkedin security block' })
      }

    } catch (e) {
      console.log((e instanceof Error) ? e.message : String(e))
    }
  }

  res.send({ status: 'OK' })
}

export default handler;
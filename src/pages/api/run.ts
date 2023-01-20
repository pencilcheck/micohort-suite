// api/run.js
import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

import dayjs from 'dayjs';

const prisma = new PrismaClient()

interface ScraperResponse {
  data: {[key: string]: string}[][];
}

async function puppeteerHandler(req: NextApiRequest, persons: { id: string, name: string}[]): Promise<ScraperResponse> {
  const url = req.headers.origin ? `${req.headers.origin || ''}/api/scrape` : `http://${req.headers.host || 'localhost:3000'}/api/scrape`;
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(persons),
  })
  
  return await response.json() as ScraperResponse;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // return persons who either hasn't scraped yet, or scraped more than 6 months ago
  const persons = await prisma.micpaPerson.findMany({
    select: {
      id: true,
      name: true,
    },
    where: {
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
    },
    take: 1 // 1 person to avoid timeout (let's test it out)
  })

  try {
    const response = await puppeteerHandler(req, persons);
    
    for (const personData of response.data) {
      const personId = personData[0]?.personId;
      if (!personId) continue;

      // reset since they might be outdated
      await prisma.micpaLinkedinPerson.deleteMany({
        where: {
          micpaPersonId: personId
        }
      });

      await prisma.micpaLinkedinPerson.createMany({
        data: personData.map((doc: {[key: string]: any}) => ({
          information: doc,
          micpaPersonId: personId,
        })) || [],
        skipDuplicates: true,
      })
    }
  } catch (e) {
  }

  res.send({ status: 'OK' })
}

export default handler;
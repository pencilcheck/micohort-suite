// api/compact.js
import type { NextApiRequest, NextApiResponse } from 'next';
import reduce from 'lodash/reduce';
import { PrismaClient, Prisma, type MicpaLinkedinPerson } from '@prisma/client';
import dayjs from 'dayjs';
import { ComponentValue, DocType, TopComponent } from '../../utils/puppeteer';

const prisma = new PrismaClient()

// We have 15 mins timeout, we need to breakup our procedures so it fits (puppeteer is very slow)
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const linkedinPersons = await prisma.micpaLinkedinPerson.findMany({
      where: {
        AND: [
          {
            scrapedAt: {
              not: null
            },
          },
          {
            OR: [
              {
                information: {
                  path: '$.compacted',
                  equals: Prisma.JsonNullValueFilter.AnyNull,
                }
              },
              {
                information: {
                  path: '$.compacted',
                  equals: false,
                }
              },
            ]
          }
        ]
      },
      take: 1,
    });

    // chunking
    for (const person of linkedinPersons) {
      const compactedInformation = reduce<DocType, DocType>(person.information as DocType, (init, value, key) => {
        if (key.includes('urn:li') && Array.isArray(value)) {
          const category = (value as TopComponent[])?.[0]?.components?.headerComponent?.title?.text;
          const newValue = (value as TopComponent[])?.slice(1).map<ComponentValue[]>((v: TopComponent): ComponentValue[] => {
            // list of entity components
            return v.components.fixedListComponent?.components.map<ComponentValue>((entity: TopComponent): ComponentValue => {
              return {
                title: ((entity.components.entityComponent?.title?.text ?? '') + ' ' + (entity.components.entityComponent?.caption?.text ?? '') + ' ' + (entity.components.entityComponent?.subtitle?.text ?? '')).trim(),
                subComponents: entity.components.entityComponent?.subComponents?.components.map<string>(c => c.components.insightComponent?.text?.text?.text || '') || [] // insightComponents
              };
            }) || [];
          }).flat();
          
          if (category) {
            return {
              ...init,
              [`parsed::${category}`]: newValue
            };
          }
        }

        return init;
      }, {});
      
      const finalInformation = {...(person.information as DocType), ...compactedInformation, compacted: true}

      await prisma.micpaLinkedinPerson.update({
        data: {
          information: finalInformation as Prisma.InputJsonValue,
          scrapedAt: dayjs().format(),
        },
        where: {
          id: person.id,
        },
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return res.send({ status: 'Error', body: (req.body as Buffer).toString(), error: message })
  }

  res.send({ status: 'OK' })
}

export default handler;
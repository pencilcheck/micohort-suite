import {expect, jest, test} from '@jest/globals';
import { PrismaClient } from "@prisma/client"
import { countOfPersonsOfEducationUnits, personsOfEducationUnits } from "../src/etl/CreditEarning"

describe('etl_CreditEarningETL.test.tsx', () => {
  const prisma = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'stdout',
        level: 'error',
      },
      {
        emit: 'stdout',
        level: 'info',
      },
      {
        emit: 'stdout',
        level: 'warn',
      },
    ],
  });
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query)
    console.log('Params: ' + e.params)
    console.log('Duration: ' + e.duration.toString() + 'ms')
  })

  describe.each([
    [["Audit Engagements"], undefined, "Audit Engagements", 256],
    [["Audit Engagements"], ['2023-11-21T08:00:00.000Z', '2023-11-22T08:00:00.000Z'], undefined, 0],
  ])('.personsOfEducationUnits(%p, %i)', (keywords: string[], datePeriod: [string, string], match: string, rows: number) => {

    test('first result contains keywords 🟢', async () => {
      const response = await personsOfEducationUnits(prisma, { keywords: keywords, creditDatePeriod: datePeriod }, { page: 1, pageSize: 50 });

      const rows = await prisma.micpaPerson.findMany({
        include: {
          educationUnits: { // nested includes for educationUnits adds extra 9s, but grabs everything I need including the details of each person's education units
            select: {
              externalSource: true,
            }
          },
        },
        where: {
          id: {
            in: response.map(r => r.id)
          }
        }
      })

      if (rows.length > 0) {
        expect(rows[0]?.educationUnits?.map(e => e.externalSource).join(' ')).toMatch(match);
      }
    }, 130000)

    test('return correct number of rows 🟢', async () => {
      const response = await countOfPersonsOfEducationUnits(prisma, { keywords: keywords, creditDatePeriod: datePeriod });
      expect(response).toEqual(rows);
    }, 130000)
  })
})

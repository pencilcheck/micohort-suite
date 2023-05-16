import set from "lodash/set";
import { z } from "zod";
import * as XLSX from "xlsx";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { MicpaPerson } from "@prisma/client";

function exclude<T, Key extends keyof T>(
  users: Array<T>,
  keys: Key[]
): Omit<T, Key>[] {
  for (const user of users) {
    for (const key of keys) {
      delete user[key]
    }
  }
  return users
}

const paginationSchema =
  z.object({
    sortStatus: z.object({
      columnAccessor: z.string(),
      direction: z.string(),
    }).nullish(),
    size: z.number(),
    page: z.number(),
  })

const paramSchema = 
  z.object({
    creditDatePeriod: z.tuple([z.date(), z.date()]),
    returnAll: z.boolean().optional(),
    isMember: z.boolean().optional(),
    isActive: z.boolean().optional(),
    // filter per education unit, not aggregated value
    threshold: z.object({
      aa: z.number(),
      mi: z.number(),
      et: z.number(),
      ot: z.number(),
    }).optional(),
  })

const paramWithPaginationSchema = paramSchema
  .merge(paginationSchema)

type Params = z.infer<typeof paramSchema>;

function getParams({ isActive, isMember, returnAll, threshold, creditDatePeriod }: Params) {
  const isActiveQuery = isActive
    ? {
        personLicense: {
          laraStatus: 'Active',
        }
      }
    : {}

  const isMemberQuery = isMember
    ? {
        memberType: {
          not: '1'
        },
      }
    : {}

  const personsQuery = returnAll
    ? {}
    : {
        ...isActiveQuery,
        ...isMemberQuery,
      }

  const AND = [];
  if (!!threshold) {
    if (typeof threshold.aa === 'number') {
      AND.push({
        educationUnits: {
          some: {
            educationCategory: 'AA',
            creditEarned: {
              gte: threshold.aa,
            },
            creditAt: {
              gte: creditDatePeriod[0],
              lte: creditDatePeriod[1],
            },
          }
        },
      })
    }
    if (typeof threshold.mi === 'number') {
      AND.push({
        educationUnits: {
          some: {
            educationCategory: 'MI',
            creditEarned: {
              gte: threshold.mi,
            },
            creditAt: {
              gte: creditDatePeriod[0],
              lte: creditDatePeriod[1],
            },
          }
        },
      })
    }
    if (typeof threshold.et === 'number') {
      AND.push({
        educationUnits: {
          some: {
            educationCategory: 'ET',
            creditEarned: {
              gte: threshold.et,
            },
            creditAt: {
              gte: creditDatePeriod[0],
              lte: creditDatePeriod[1],
            },
          }
        },
      })
    }
    if (typeof threshold.ot === 'number') {
      AND.push({
        educationUnits: {
          some: {
            educationCategory: 'OT',
            creditEarned: {
              gte: threshold.ot,
            },
            creditAt: {
              gte: creditDatePeriod[0],
              lte: creditDatePeriod[1],
            },
          }
        },
      })
    }
  }
  const where = {
    ...personsQuery,
    ...(AND.length > 0 ? { AND } : {}),
  }

  return where;
}

export const creditEarningRouter = createTRPCRouter({
  report: publicProcedure
    .input(paramSchema)
    .query(async ({ input, ctx }) => {
      const where = getParams(input)

      const persons = await ctx.prisma.micpaPerson.findMany({
        include: {
          aggregatedEduUnits: true,
        },
        where,
      })

      const safeRows = exclude<MicpaPerson, 'scrapedAt'>(persons as MicpaPerson[], ['scrapedAt'])

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const ws = XLSX.utils.json_to_sheet(safeRows, {});
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const wb = XLSX.utils.book_new();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const buffer = XLSX.write(wb, { type: "base64" }) as string;

      return {
        buffer
      };
    }),

  fetchAll: publicProcedure
    .input(paramWithPaginationSchema)
    .query(async ({ input, ctx }) => {
      const where = getParams(input)

      const result = await Promise.all([
        ctx.prisma.micpaPerson.findMany({
          include: {
            aggregatedEduUnits: true,
          },
          where,
          orderBy: set({}, input?.sortStatus?.columnAccessor || 'name', input?.sortStatus?.direction || 'desc'),
          take: input.size,
          skip: (input.page-1) * input.size,
        }),
        ctx.prisma.micpaPerson.count({ where })
      ])

      // let UI handle filtering aggregated threshold
      return result;
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

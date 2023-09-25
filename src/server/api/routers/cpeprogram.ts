import set from "lodash/set";
import { z } from "zod";
import * as XLSX from "xlsx";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import type { MailingList, MicpaPerson } from "@prisma/client";
import isEmpty from "lodash/isEmpty";
import isAfter from "date-fns/isAfter";
import { createMailingListsOnPersons } from "./list";

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
    keywords: z.array(z.string()).optional(),
    source: z.enum(["3rd-party", "micpa", "both"]).optional(),
    creditDatePeriod: z.tuple([z.date(), z.date()]),
  })

const paramWithPaginationSchema = paramSchema
  .merge(paginationSchema)

export type Params = z.infer<typeof paramSchema>;

function createParams({
  keywords,
  source = 'both',
  creditDatePeriod
}: Params) {
  if (isAfter(creditDatePeriod[0], creditDatePeriod[1])) {
    throw new Error(`invalid period value: ${JSON.stringify(creditDatePeriod)}`)
  }

  const sourceToggle = source === '3rd-party' ? { isThirdParty: true } : source === 'micpa' ? { isThirdParty: false } : {}

  // prisma mysql fulltext: https://www.prisma.io/docs/concepts/components/prisma-client/full-text-search#mysql
  const keywordQuery = !isEmpty(keywords) ? {
    externalSource: {
      search: keywords?.map(k => `'${k}'`).join(' | ')
    }
  } : {};

  const creditDateQuery = !isEmpty(creditDatePeriod) ? {
    AND: [
      {
        creditAt: {
          gte: creditDatePeriod?.[0],
        }
      },
      {
        creditAt: {
          lte: creditDatePeriod?.[1],
        }
      }
    ]
  } : null;

  const dateRangeQuery = creditDateQuery ?? {};

  // if just persons, only 3s
  return !isEmpty({ ...dateRangeQuery, ...keywordQuery, ...sourceToggle })
    ? {
      educationUnits: {
        some: {
          ...dateRangeQuery,
          ...keywordQuery,
          ...sourceToggle,
        }
      }
    }
    : {};
}

export const cpeProgramRouter = createTRPCRouter({
  fetchDropdownAll: publicProcedure
    .query(async ({ ctx }) => {
      return await ctx.prisma.keywordFilterDropdown.findMany({});
    }),

  createDropdown: publicProcedure
    .input(
      z.object({
        value: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.keywordFilterDropdown.create({
        data: {
          label: input.value,
          value: input.value,
        }
      });

      return { status: "ok" };
    }),

  report: publicProcedure
    .input(paramSchema)
    .query(async ({ input, ctx }) => {
      const where = createParams(input);
      const ids = await ctx.prisma.micpaPerson.findMany({
        select: {
          id: true,
        },
        where,
      });

      const persons = await ctx.prisma.micpaExportPerson.findMany({
        where: {
          id: {
            in: ids.map(i => i.id)
          }
        },
      });

      const safeRows = exclude<MicpaPerson, 'scrapedAt'>(persons, ['scrapedAt'])

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

  fetchAllCount: publicProcedure
    .input(paramSchema)
    .query(async ({ input, ctx }) => {
      // takes 10+s
      const where = createParams(input);
      return await ctx.prisma.micpaPerson.count({
        where,
      });
    }),

  fetchAllPersonIds: publicProcedure
    .input(paramWithPaginationSchema)
    .query(async ({ input, ctx }) => {
      // 7s
      const where = createParams(input);
      return await ctx.prisma.micpaPerson.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          address: true,
        },
        where,
        orderBy: set({}, input?.sortStatus?.columnAccessor || 'name', input?.sortStatus?.direction || 'desc'),
        take: input.size,
        skip: (input.page-1) * input.size,
      });
    }),

  fetchPersonEducationDetails: publicProcedure
    .input(
      z.object({
        id: z.string(),
        creditDatePeriod: z.tuple([z.date(), z.date()]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const creditDateQuery = !isEmpty(input.creditDatePeriod) ? {
        AND: [
          {
            creditAt: {
              gte: input.creditDatePeriod?.[0],
            }
          },
          {
            creditAt: {
              lte: input.creditDatePeriod?.[1],
            }
          }
        ]
      } : null;

      const dateRangeQuery = creditDateQuery ?? {};

      const result = await ctx.prisma.$transaction([
        ctx.prisma.micpaEducationUnit.count({
          where: {
            personId: input.id,
            ...dateRangeQuery,
          }
        }),
        ctx.prisma.micpaEducationUnit.findMany({
          select: {
            id: true,
            orderId: true,
            personId: true,
            isThirdParty: true,
            productId: true, // use this to group education category
            externalSource: true,
            educationCategory: true,
            creditEarned: true,
            creditAt: true,
          },
          where: {
            personId: input.id,
            ...dateRangeQuery,
          }
        }),
      ]);

      return {
        total: result[0],
        rows: result[1],
      };
    }),

  addCPEProgramResultToList: publicProcedure
    .input(paramSchema.extend({
      listId: z.string().optional(),
      isNew: z.boolean().optional(),
      newTitle: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const where = createParams(input);
      const persons = await ctx.prisma.micpaPerson.findMany({
        where,
      });
      const ids = persons.map(p => p.id);

      let list: MailingList | undefined;
      if (input.isNew) {
        list = await ctx.prisma.mailingList.create({
          data: {
            title: input.newTitle || `A mailing list ${new Date().toDateString()}`
          },
        });
      }

      // new list takes priority
      if (list?.id || input.listId) {
        return await createMailingListsOnPersons(ids, (list?.id || input.listId || 'New List'), ctx.prisma);
      }

      return null;
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

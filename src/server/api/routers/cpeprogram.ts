import set from "lodash/set";
import pick from "lodash/pick";
import keys from "lodash/keys";
import { z } from "zod";
import * as XLSX from "xlsx";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { countOfPersonsOfEducationUnits, personsOfEducationUnits } from "../../../etl/CPEProgram";
import { MicpaPerson } from "@prisma/client";
import isEmpty from "lodash/isEmpty";

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
    .input(
      z.object({
        keywords: z.array(z.string()).optional(),
        source: z.enum(["3rd-party", "micpa", "both"]).optional(),
        creditDatePeriod: z.tuple([z.date(), z.date()]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const persons = await personsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source, creditDatePeriod: input.creditDatePeriod }) as { id: string }[];

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

  fetchAllCount: publicProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).optional(),
        source: z.enum(["3rd-party", "micpa", "both"]).optional(),
        creditDatePeriod: z.tuple([z.date(), z.date()]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // takes 10+s
      return await countOfPersonsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source, creditDatePeriod: input.creditDatePeriod });
    }),

  fetchAllPersonIds: publicProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).optional(),
        source: z.enum(["3rd-party", "micpa", "both"]).optional(),
        creditDatePeriod: z.tuple([z.date(), z.date()]).optional(),
        sortStatus: z.object({
          columnAccessor: z.string(),
          direction: z.string(),
        }).nullish(),
        size: z.number(),
        page: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      // 7s
      return await personsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source, creditDatePeriod: input.creditDatePeriod }, { page: input.page, pageSize: input.size, orderBy: set({}, input?.sortStatus?.columnAccessor || 'name', input?.sortStatus?.direction || 'desc') })
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

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

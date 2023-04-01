import set from "lodash/set";
import pick from "lodash/pick";
import keys from "lodash/keys";
import { z } from "zod";
import * as XLSX from "xlsx";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { countOfPersonsOfEducationUnits, personsOfEducationUnits } from "../../../etl/CreditEarning";
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
      const persons = await personsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source, creditDatePeriod: input.creditDatePeriod });
      const rows = await ctx.prisma.micpaPerson.findMany({
        select: {
        },
        where: {
          id: {
            in: persons.map((r: MicpaPerson) => r.id),
          }
        }
      });

      const safeRows = exclude<MicpaPerson, 'scrapedAt'>(rows as MicpaPerson[], ['scrapedAt'])

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
        sortStatus: z.object({
          columnAccessor: z.string(),
          direction: z.string(),
        }).nullish(),
        size: z.number(),
        page: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      // The whole API call takes 01:43.76 minutes, since we have 3 queries done in sequencial order, if I put into $transaction it will timeout on planetscale (exceeding timeout 20s limit)
      // Added library to cache queries https://github.com/Asjas/prisma-redis-middleware so at least in session, it will be faster on second time around

      const totalCount = await countOfPersonsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source, creditDatePeriod: input.creditDatePeriod });

      return totalCount;
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
      // The whole API call takes 01:43.76 minutes, since we have 3 queries done in sequencial order, if I put into $transaction it will timeout on planetscale (exceeding timeout 20s limit)
      // Added library to cache queries https://github.com/Asjas/prisma-redis-middleware so at least in session, it will be faster on second time around

      const persons = await personsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source, creditDatePeriod: input.creditDatePeriod }, { page: input.page, pageSize: input.size, orderBy: set({}, input?.sortStatus?.columnAccessor || 'name', input?.sortStatus?.direction || 'desc') })

      return persons;
    }),

  fetchAllPersons: publicProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      })
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.prisma.micpaPerson.findMany({
        include: {
          _count: {
            select: {
              educationUnits: true
            }
          },
          educationUnits: { // nested includes for educationUnits adds extra 9s, but grabs everything I need including the details of each person's education units
            select: {
              isThirdParty: true,
              productId: true, // use this to group education category
              product: true, // nseted includes product adds extra 200ms
              externalSource: true,
              educationCategory: true,
              creditEarned: true,
              creditAt: true,
            }
          },
        },
        where: {
          id: {
            in: input.ids,
          }
        }
      })

      return rows;
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

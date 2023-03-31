import set from "lodash/set";
import pick from "lodash/pick";
import keys from "lodash/keys";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { countOfPersonsOfEducationUnits, personsOfEducationUnits } from "../../../etl/CreditEarning";
import { MicpaPerson } from "@prisma/client";

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

  fetchAll: publicProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).optional(),
        source: z.enum(["3rd-party", "micpa", "both"]).optional(),
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

      const totalCount = await countOfPersonsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source });
      const persons = await personsOfEducationUnits(ctx.prisma, { keywords: input.keywords, source: input.source }, { page: input.page, pageSize: input.size, orderBy: set({}, input?.sortStatus?.columnAccessor || 'name', input?.sortStatus?.direction || 'desc') })

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
            in: persons.map((r: MicpaPerson) => r.id),
          }
        }
      })

      return {
        total: totalCount,
        rows: rows,
      };
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

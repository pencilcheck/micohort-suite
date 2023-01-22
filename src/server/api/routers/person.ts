import set from "lodash/set";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const personRouter = createTRPCRouter({
  fetchAll: publicProcedure
    .input(
      z.object({
        sortStatus: z.object({
          columnAccessor: z.string(),
          direction: z.string(),
        }).nullish(),
        size: z.number(),
        page: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await ctx.prisma.$transaction([
        ctx.prisma.micpaPerson.count(),
        ctx.prisma.micpaPerson.findMany({
          include: {
            linkedinPersons: true,
          },
          skip: input.size * (input.page-1),
          take: input.size,
          orderBy: {
            [input.sortStatus?.columnAccessor || 'name']: input.sortStatus?.direction || 'asc',
          },
        })
      ]);

      return {
        total: result[0],
        rows: result[1],
      };
    }),

  fetchOneLinkedinPerson: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = ctx.prisma.micpaLinkedinPerson.findUnique({
        where: {
          id: input.id
        },
        include: {
          micpaPerson: true
        }
      })

      return result;
    }),

  fetchAllLinkedinPersons: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sortStatus: z.object({
          columnAccessor: z.string(),
          direction: z.string(),
        }).nullish(),
        size: z.number(),
        page: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await ctx.prisma.$transaction([
        ctx.prisma.micpaLinkedinPerson.count(),
        ctx.prisma.micpaLinkedinPerson.findMany({
          // cannot select information as it is too big will cause sort to go out of memory from mysql
          select: {
            id: true,
            scrapedAt: true,
            micpaPersonId: true,
            createdAt: true,
            micpaPerson: true,
          },
          where: {
            micpaPerson: {
              name: input.search || undefined
            }
          },
          skip: input.size * (input.page-1),
          take: input.size,
          orderBy: set({}, input.sortStatus?.columnAccessor || 'micpaPerson.name', input.sortStatus?.direction),
        })
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

import set from "lodash/set";
import pick from "lodash/pick";
import keys from "lodash/keys";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const listRouter = createTRPCRouter({
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
        ctx.prisma.mailingList.count(),
        ctx.prisma.mailingList.findMany({
          include: {
            persons: true,
          },
          skip: input.size * (input.page-1),
          take: input.size,
          orderBy: {
            [input.sortStatus?.columnAccessor || 'title']: input.sortStatus?.direction || 'asc',
          },
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

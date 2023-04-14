import set from "lodash/set";
import pick from "lodash/pick";
import keys from "lodash/keys";
import uniq from "lodash/uniq";
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
      // put count inside transaction make it insanly slow, don't put them in transaction
      const total = (await ctx.prisma.mailingList.count({
        select: {
          _all: true,
        }
      }))._all;

      const rows = await ctx.prisma.mailingList.findMany({
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              persons: true,
            }
          }
        },
        skip: input.size * (input.page-1),
        take: input.size,
        orderBy: set({}, input?.sortStatus?.columnAccessor || 'createdAt', input?.sortStatus?.direction || 'desc')
      });

      return {
        total: total,
        rows: rows,
      };
    }),

  deleteList: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.mailingListsOnPersons.deleteMany({
        where: {
          mailingListId: input.id,
        },
      });

      const list = await ctx.prisma.mailingList.delete({
        where: {
          id: input.id,
        },
      });

      return list;
    }),

  importFromFile: publicProcedure
    .input(
      z.object({
        name: z.string(),
        ids: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const newList = await ctx.prisma.mailingList.create({
        data: {
          title: input.name,
        },
      });

      // assuming input.ids are all actual personIds, no check
      // use lodash to remove duplicate ids
      await ctx.prisma.mailingListsOnPersons.createMany({
        data: uniq(input.ids).map((id) => ({
          mailingListId: newList.id,
          personId: id
        })),
      });

      return newList;
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

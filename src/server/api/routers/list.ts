import set from "lodash/set";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import type { MailingList, PrismaClient } from "@prisma/client";

export const createMailingListsOnPersons = async (ids: string[], listId: string, prisma: PrismaClient) => {
  return await prisma.mailingListsOnPersons.createMany({
    data: ids.map((id) => ({
      mailingListId: listId,
      personId: id,
    })),
    skipDuplicates: true,
  });
}

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

  addPersonsToList: publicProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        listId: z.string().optional(),
        isNew: z.boolean().optional(),
        newTitle: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
        return await createMailingListsOnPersons(input.ids, (list?.id || input.listId || 'New List'), ctx.prisma);
      }

      return null;
    }),

  deletePersonFromList: publicProcedure
    .input(
      z.object({
        personId: z.string(),
        listId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.prisma.mailingListsOnPersons.deleteMany({
        where: {
          mailingListId: input.listId,
          personId: input.personId,
        },
      });

      return result;
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

      await createMailingListsOnPersons(input.ids, newList.id, ctx.prisma);

      return newList;
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

import set from "lodash/set";
import pick from "lodash/pick";
import keys from "lodash/keys";
import { z } from "zod";
import dayjs from 'dayjs';
import fetch from 'node-fetch';

import type { ScrapeResponse } from "../../../etl/types";

import { env } from "../../../env/server.mjs";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const linkedinRouter = createTRPCRouter({
  scrapeLinkedinPersons: publicProcedure
    .input(
      z.object({
        scrapeProfiles: z.array(z.object({
          id: z.string(),
          name: z.string(),
        })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await fetch(`${env.DENO_SCRAPE_URL}/scrape`, {
          method: 'POST',
          body: JSON.stringify({ persons: input?.scrapeProfiles }),
          headers: {
            'content-type': 'application/json'
          },
        })
        console.log('making fetch request', response.status)
        if (response.status === 200) {
          const json = await response.json();
          console.log('woohoo puppeteer on serverless', json)
          const recordDocs = json as ScrapeResponse[];

          // return persons who either hasn't scraped yet, or scraped more than 6 months ago

          for (const record of recordDocs) {
            // reset since they might be outdated
            await ctx.prisma.micpaLinkedinPerson.deleteMany({
              where: {
                micpaPersonId: record.personId
              }
            });

            await ctx.prisma.micpaLinkedinPerson.createMany({
              data: record.profiles.map(doc => ({
                information: doc,
                micpaPersonId: record.personId,
              })),
              skipDuplicates: true,
            });

            await ctx.prisma.micpaPerson.update({
              data: {
                scrapedAt: dayjs().format()
              },
              where: {
                id: record.personId
              }
            });
          }
          return { status: "ok" };
        } else {
          return { status: "error" };
        }
      } catch (e) {
        console.log((e instanceof Error) ? e.message : String(e))
      }
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});

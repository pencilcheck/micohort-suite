import type { Prisma, PrismaClient } from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";

export const extendedClient = (client: PrismaClient) => {
  //const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
    //excludeModels: ["MailingList", "MicpaPerson"],
    //excludeMethods: ["count", "groupBy"],
    //cacheTime: 300,
    //onHit: (key) => {
      //console.log("hit", key);
    //},
    //onMiss: (key) => {
      //console.log("miss", key);
    //},
    //onError: (key) => {
      //console.log("error", key);
    //},
  //});
  //client.$use(cacheMiddleware);

  //, "PersonCPALicenses"."MICPA_LARAStatus" = ''Active'' as active

  const xprisma = client.$extends({
    name: 'creditEarned',
    result: {
      micpaPerson: {
        creditEarned: {
          needs: { "id": true },
          compute({ id }) {
            return async (
              {
                educationCategory,
                start,
                end
              }: {
                educationCategory: string;
                start: Date;
                end: Date;
              }
            ) => {
              const aggregations = await xprisma.micpaEducationUnit.aggregate({
                _sum: {
                  creditEarned: true,
                },
                where: {
                  personId: id,
                  educationCategory: {
                    contains: educationCategory
                  },
                  creditAt: {
                    gte: start,
                    lte: end,
                  }
                }
              });

              return aggregations._sum.creditEarned;
            }
          },
        },
        creditEarnedMap: {
          needs: { "id": true },
          compute({ id }) {
            return async (
              {
                start,
                end
              }: {
                start: Date;
                end: Date;
              }
            ) => {
              const grouping = await xprisma.micpaEducationUnit.groupBy({
                by: ['educationCategory'],
                _sum: {
                  creditEarned: true,
                },
                where: {
                  personId: id,
                  creditAt: {
                    gte: start,
                    lte: end,
                  }
                }
              });

              return grouping;
            }
          },
        },
      },
    },
  })

  return xprisma;
}

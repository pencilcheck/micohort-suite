import { type Prisma, PrismaClient } from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";

import { env } from "../env/server.mjs";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
  cacheTime: 300,
  onHit: (key) => {
    console.log("hit", key);
  },
  onMiss: (key) => {
    console.log("miss", key);
  },
  onError: (key) => {
    console.log("error", key);
  },
});

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

prisma.$use(cacheMiddleware);

if (env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

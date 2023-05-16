import { PrismaClient } from "@prisma/client";

import { env } from "../env/server.mjs";

import { extendedClient } from "../extends";

export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || extendedClient(new PrismaClient({
  log:
    env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
}));

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

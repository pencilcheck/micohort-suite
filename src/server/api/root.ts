import { createTRPCRouter } from "./trpc";
import { exampleRouter } from "./routers/example";
import { personRouter } from "./routers/person";
import { listRouter } from "./routers/list";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  person: personRouter,
  list: listRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

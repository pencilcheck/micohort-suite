import { createTRPCRouter } from "./trpc";
import { exampleRouter } from "./routers/example";
import { personRouter } from "./routers/person";
import { listRouter } from "./routers/list";
import { cpeProgramRouter } from "./routers/cpeprogram";
import { linkedinRouter } from "./routers/linkedin";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  person: personRouter,
  list: listRouter,
  cpeProgram: cpeProgramRouter,
  linkedinRouter: linkedinRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

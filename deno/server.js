import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { initPage, testPuppeteer, findProfilesV2 } from './utils/puppeteer.ts';

const app = new Application();
const router = new Router();

/**
 * Setup routes.
 */

router
  .get("/", (context) => {
    context.response.body = "Welcome to the Dinosaur API!";
  })
  .get("/test", async (context) => {
    const response = await testPuppeteer()

    context.response.body = response;
  })
  .post("/scrape", async (context) => {
    const { persons } = await context.request.body("json").value;
    console.log("request.body", JSON.stringify(persons, null, 4))

    const records = [];
    const [page, browser] = await initPage();
    for (const person of persons) {
      const response = await findProfilesV2(page, person);
      records.push({ personId: person.id, profiles: response });
    }
    await browser.close();

    console.log("request.response length", records.length)
    context.response.type = "application/json";
    context.response.headers.set("Content-Type", "application/json");
    context.response.status = 200;
    context.response.body = records;
  });

/**
 * Setup middleware.
 */

app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

/**
 * Start server.
 */

await app.listen({ port: 8000 });

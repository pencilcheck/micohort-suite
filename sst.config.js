import { NextjsSite } from "sst/constructs"

export default {
  config: () => ({
    name: "micohort-suite",
    region: "us-east-1",
  }),
  stacks: async (app) => {
    app.stack(function Web(ctx) {
      new NextjsSite(ctx.stack, "MicohortSuite", {
        defaults: {
          function: {
            runtime: "nodejs14.x", // this doesn't work
            timeout: 900, // this doesn't work
          }
        },
      })
    });
  },
}
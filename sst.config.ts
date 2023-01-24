import { NextjsSite } from "sst/constructs"

export default {
  config: () => ({
    name: "micohort-suite",
    region: "us-east-1",
  }),
  stacks: async (app: any) => {
    app.stack(function Web(ctx: any) {
      new NextjsSite(ctx.stack, "MicohortSuite", {
        defaults: {
          function: {
            timeout: 900,
            memorySize: 1500,
          }
        },
      })
    });
    app.setDefaultFunctionProps({
      runtime: "nodejs14.x",
    })
  },
}
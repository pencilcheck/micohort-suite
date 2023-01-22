# This readme contains information about SST (a.k.a. serverless deployment on AWS)

# How to deploy

1. Need to setup IAM on AWS: https://sst.dev/chapters/create-an-iam-user.html
2. Make sure your local node is at least v14 (Recommend using nvm to track)
3. Then run `npx sst deploy` (has to be npx, somehow pnpx didn't work)

## All supported runtime for node on AWS lambda

https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html?icmpid=docs_lambda_help

## Caveats

When deploying, make sure memory threshold, timeout and node runtime is set correctly, right now sst.config.js doesn't work, so have to manually change it from AWS console configuration page

1. Go to AWS lambda and find the function responsible for handling API routes
2. Once you find them (e.g. https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/persona-micohort-suite-We-MicohortSuiteServerFunct-xCKGPB30jADk?tab=configure) open configuration tab, and click on "General Configuration" on the left, and click "edit" to edit the timeout.
3. Prefer longest timeout available which is 15mins
4. Memory should be higher than 1.5G (chrome uses a lot of memory)
5. Then go back and click on "Code" tab, which is right above and between the panels in the middle
6. Scroll down and click "Edit" on runtime settings and change to Node.js 14.x (needed for chrome-aws-lambda >= 6.0.0)
7. Done

Until a solution is found where sst.config.js actually configures correctly, will have to continue this manual method for now
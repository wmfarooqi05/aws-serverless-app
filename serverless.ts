import type { AWS } from "@serverless/typescript";

import { getLeads, getLeadById } from "@functions/leads";

const serverlessConfiguration: AWS = {
  service: "gel-api",
  frameworkVersion: "3",
  plugins: ["serverless-esbuild", "serverless-offline"],
  configValidationMode: "error",
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    stage: "dev",
    region: "ca-central-1",
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: ["codedeploy:*"],
            Resource: "*",
          },
        ],
      },
    },
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",

      REGION: "${self:custom.region}",
      STAGE: "${self:custom.stage}",

      // aurora
      // AURORA_HOST: "${self:custom.AURORA.HOST}",
      // AURORA_PORT: "${self:custom.AURORA.PORT}",
    },
    tracing: {
      lambda: true,
    },
  },
  // import the function via paths
  functions: { getLeadById, getLeads },
  package: { individually: true },
  custom: {
    region: "${opt:region, self:provider.region}",
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    // "serverless-offline": {
    //   httpPort: 3000,
    //   resourceRoutes: true,
    //   babelOptions: {
    //     presets: ["env"],
    //   },
    // },
    serverlessOffline: {
      resourceRoutes: true,
    },
    stage: "${opt:stage, self:provider.stage}",
  },
};

module.exports = serverlessConfiguration;

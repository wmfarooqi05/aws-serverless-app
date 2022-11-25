import type { AWS } from "@serverless/typescript";

import { getLeads, getLeadById, createLead } from "@functions/leads";

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
    timeout: 900,
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

      // ge-db-dev-1.cluster-cyb3arxab5e4.ca-central-1.rds.amazonaws.com
      // aurora
      // AURORA_HOST: "cluster-cyb3arxab5e4.ca-central-1.rds.amazonaws.com",
      // AURORA_PORT: "${self:custom.AURORA.PORT}",
      // #common
      // DB_NAME: "${self:custom.DB_NAME}"
      // USERNAME: "${self:custom.USERNAME}"
      // PASSWORD: "${self:custom.PASSWORD}"

    },
    tracing: {
      lambda: true,
    },
  },
  // import the function via paths
  functions: { getLeadById, getLeads, createLead },
  package: { individually: true },
  custom: {
    region: "${opt:region, self:provider.region}",
    DB_NAME: "ge-db-dev-1",
    USERNAME: "postgres",
    PASSWORD: "v16pwn1QyN8iCixbWfbL",

    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk", "pg-native", "pg-hstore"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    serverlessOffline: {
      resourceRoutes: true,
    },
    stage: "${opt:stage, self:provider.stage}",
  },
  resources: {
    Resources: {
      LeadTable: {
        Type: 'AWS::RDS::DBInstance',
        Properties: {
          DBName: "ge-db-dev-1",
          MasterUsername: "postgres",
          MasterUserPassword: "v16pwn1QyN8iCixbWfbL",
          AvailabilityZone: "ca-central-1",
          // VPCSecurityGroups: [{ Ref: "sg-0bcaf1e5086effdd5" }],
          // DBInstanceClass : "db.t4g.large",
          Engine: "Aurora PostgreSQL",
          Port: "5432",
          // Engine: "postgres",
          // Engine: "postgresql"
        }
      }
    }
  }
};

module.exports = serverlessConfiguration;

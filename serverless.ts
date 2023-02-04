import type { AWS } from "@serverless/typescript";
import * as dotenv from "dotenv";
// import allFunctions from "src/sls-config/ca-central-1/functions";
import allFunctions from "@functions/index";

dotenv.config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });

const serverlessConfiguration: AWS = {
  service: "gel-api",
  frameworkVersion: "3",
  plugins: [
    "serverless-esbuild",
    "serverless-offline",
    "serverless-dotenv-plugin",
  ],
  configValidationMode: "error",
  useDotenv: true,
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    region: "ca-central-1",
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10,
    stage: "${self:custom.STAGE}",
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
    // deploymentBucket: {
    //   name: "gel-api-stage-serverlessdeploymentbucket-165b8hefrrasz"
    // },
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    vpc: {
      securityGroupIds: ["sg-0bcaf1e5086effdd5"],
      subnetIds: [
        "subnet-0c87da38c707b23d3",
        "subnet-08b4521bc0da095f4",
        "subnet-0254663a738570f0c",
      ],
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      REGION: "${self:custom.region}",
      STACK_NAME: "${self:custom.STACK_NAME}",

      // STAGE: "${opt:stage, 'dev'}",

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
  functions: allFunctions,
  package: { individually: true },
  custom: {
    region: "${opt:region, self:provider.region}",
    SCHEDULING_QUEUE: "scheduling-queue-${opt:stage, self:provider.stage}",
    STACK_NAME: "${opt:stage, self:provider.stage}",
    // TIMEOUT: process.env.TIMEOUT,
    DB_NAME: "ge-db-dev-1",
    USERNAME: "postgres",
    PASSWORD: "v16pwn1QyN8iCixbWfbL",
    // TIMEOUT: process.env.TIMEOUT,
    STAGE: process.env.NODE_ENV,
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: [
        "aws-sdk",
        "pg-native",
        "pg-hstore",
        "better-sqlite3",
        "mysql2",
        "oracledb",
        "sqlite3",
        "tedious",
        "mysql",
        "pg-query-stream",
        "assert",
        "fs",
        "os",
        "https",
        "http",
        "stream",
        "tty",
        "zlib",
        "timers",
        "path",
        "crypto",
        "dns",
        "module",
        "process",
        "http2",
        "child_process",
      ],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    serverlessOffline: {
      resourceRoutes: true,
      allowCache: true,
      useChildProcesses: true,
    },
  },
  // resources: {
  //   Resources: {
  //     ScheduleGroup: {
  //       Type: "AWS::Scheduler::ScheduleGroup",
  //       Properties: {
  //         QueueName: "${self:custom.SCHEDULING_QUEUE}",
  //         Region: "ap-southeast-1"
  //       },

  //     },
  //   },
  //   Outputs: {
  //     SchedulerGroupName: {
  //       Description: "Schedule group name",
  //       Value: "${self:custom.SCHEDULING_QUEUE}",
  //       Export: {
  //         Name: "${self:custom.STACK_NAME}-schedule-group-name",
  //       },
  //     },
  //   },
  // },
  // }
  // resources: {
  //   Resources: {
  //     CompanyTable: {
  //       Type: 'AWS::RDS::DBInstance',
  //       Properties: {
  //         DBName: "geldbtest",
  //         MasterUsername: "postgres",
  //         MasterUserPassword: "postgres_qasid123",
  //         AvailabilityZone: "ca-central-1",

  //         // VPCSecurityGroups: [{ Ref: "sg-0bcaf1e5086effdd5" }],
  //         // DBInstanceClass : "db.t4g.large",
  //         Engine: "Aurora PostgreSQL",
  //         Port: "5432",
  //         // Engine: "postgres",
  //         // Engine: "postgresql"
  //       }
  //     }
  //   }
  // }
  // resources: {
  //   Resources: {
  //     ApiGatewayAuthorizer: {
  //       Type: "AWS::ApiGateway::Authorizer",
  //       Properties: {
  //         Name: "CognitoUserPool",
  //         Type: "COGNITO_USER_POOLS",
  //         IdentitySource: "method.request.header.Authorization",
  //         RestApiId: {
  //           Ref: "ApiGatewayRestApi",
  //         },
  //         ProviderARNs: [
  //           "arn:aws:cognito-idp:ca-central-1:524073432557:userpool/ca-central-1_mJllgwkkd",
  //         ],
  //       },
  //     },
  //     // UserPool: { // this line is name
  //     //   Type: "AWS::Cognito::UserPool",
  //     //   Properties:{
  //     //     "UserPoolName": "SALES_REP"
  //     //   }
  //     // }
  //   },
  // },
};

module.exports = serverlessConfiguration;

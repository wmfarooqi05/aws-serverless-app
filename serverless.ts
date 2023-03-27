import type { AWS } from "@serverless/typescript";
import * as dotenv from "dotenv";
// import allFunctions from "src/sls-config/ca-central-1/functions";
import allFunctions from "@functions/index";
import { ensureEnvConfigs } from "./helper";

var fs = require("fs");
var contents = fs.readFileSync("package.json");
const dependencies: string[] = Object.keys(
  JSON.parse(contents)["devDependencies"]
).concat(...Object.keys(JSON.parse(contents)["dependencies"]));

dotenv.config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });

const serviceName = "gel-api";

ensureEnvConfigs();

const serverlessConfiguration: AWS = {
  service: serviceName,
  frameworkVersion: "3",
  plugins: [
    "serverless-esbuild",
    "serverless-offline",
    "serverless-dotenv-plugin",
    "serverless-layers",
  ],
  configValidationMode: "error",
  useDotenv: true,
  provider: {
    name: "aws",
    runtime: "nodejs18.x",
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
    deploymentBucket: {
      name: "${self:custom.DEPLOYMENT_BUCKET}",
    },
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    vpc: {
      securityGroupIds: ["${self:custom.VPC_SECURITY_GROUP}"],
      subnetIds: [
        "${self:custom.PRIVATE_SUBNET_1}",
        "${self:custom.PRIVATE_SUBNET_2}",
        "${self:custom.PRIVATE_SUBNET_3}",
      ],
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      REGION: "${self:custom.region}",
      STACK_NAME: "${self:custom.STACK_NAME}",
      JOB_QUEUE: "${self:custom.JOB_QUEUE}",
      // STAGE: "${opt:stage, 'dev'}",

      // ge-db-dev-1.cluster-cyb3arxab5e4.ca-central-1.rds.amazonaws.com
      // aurora
      // AURORA_HOST: "cluster-cyb3arxab5e4.ca-central-1.rds.amazonaws.com",
      // AURORA_PORT: "${self:custom.AURORA.PORT}",
      // #common
      // DB_NAME: "${self:custom.DB_NAME}"
      // EMPLOYEENAME: "${self:custom.EMPLOYEENAME}"
      // PASSWORD: "${self:custom.PASSWORD}"
    },
    tracing: {
      lambda: true,
    },
  },
  // import the function via paths
  functions: allFunctions,
  package: {
    individually: true,
  },
  custom: {
    region: "${opt:region, self:provider.region}",
    // SCHEDULING_QUEUE: "scheduling-queue-${opt:stage, self:provider.stage}",
    JOB_QUEUE: "job-queue-${opt:stage, self:provider.stage}",
    STACK_NAME: "${opt:stage, self:provider.stage}",
    // TIMEOUT: process.env.TIMEOUT,
    DB_NAME: "ge-db-dev-1",
    USERNAME: "postgres",
    PASSWORD: "v16pwn1QyN8iCixbWfbL",
    // TIMEOUT: process.env.TIMEOUT,
    STAGE: process.env.NODE_ENV,
    CACHE_INSTANCE_SIZE: "cache.t2.micro",
    DEPLOYMENT_BUCKET: process.env.DEPLOYMENT_BUCKET,
    VPC_ID: process.env.VPC_ID,
    PRIVATE_SUBNET_1: process.env.PRIVATE_SUBNET_1,
    PRIVATE_SUBNET_2: process.env.PRIVATE_SUBNET_2,
    PRIVATE_SUBNET_3: process.env.PRIVATE_SUBNET_3,
    PUBLIC_SUBNET_1: process.env.PUBLIC_SUBNET_1,
    VPC_SECURITY_GROUP: process.env.VPC_SECURITY_GROUP,
    JOBS_FOLDER: process.env.JOBS_FOLDER,
    userPoolId: process.env.USER_POOL_ID,
    cognitoAuthorizerArn:
      "arn:aws:cognito-idp:${self:provider.region}:${self:provider.accountId}:userpool/${self:custom.userPoolId}",

    // move it to different file
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      watch: {
        pattern: ["src/**/*.ts"],
        ignore: ["temp/**/*"],
      },
      exclude: [
        ...dependencies,
        "@aws-sdk",
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
      target: "node18",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    serverlessOffline: {
      resourceRoutes: false,
      allowCache: true,
      useChildProcesses: true,
    },
    "serverless-layers": {
      packageManager: "npm",
      dependenciesPath: "package.json",
      compatibleRuntimes: ["nodejs16.x", "nodejs18.x"],
    },
  },
  // include resources from resources.ts
  resources: {
    Resources: {
      MyBucketPolicy: {
        Type: "AWS::S3::BucketPolicy",
        Properties: {
          Bucket: process.env.DEPLOYMENT_BUCKET,
          PolicyDocument: {
            Statement: [
              {
                Sid: "AllowLambdaToPutObjects",
                Effect: "Allow",
                Principal: {
                  Service: "lambda.amazonaws.com",
                },
                Action: "s3:PutObject",
                Resource:
                  "arn:aws:s3:::${self:custom.DEPLOYMENT_BUCKET}/${self:custom.JOBS_FOLDER}/*",
              },
            ],
          },
        },
      },
      JobQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "${self:custom.JOB_QUEUE}",
        },
      },
      // Websocket endpoint authorization with cognito
      // WebsocketAuthorizer: {
      //   Type: "AWS::ApiGateway::Authorizer",
      //   Properties: {
      //     AuthorizerUri:
      //       "arn:aws:apigateway:${self:provider.region}:lambda:path/2015-03-31/functions/${self:service}-${self:provider.stage}-authorizer.${self:provider.region}.amazonaws.com/${self:provider.stage}/authorizer",
      //     IdentitySource: "route.request.querystring.Authorization",
      //     Name: "websocket-authorizer",
      //     RestApiId: { Ref: "ApiGatewayRestApi" },
      //     Type: "COGNITO_USER_POOLS",
      //     ProviderARNs: ["${self:custom.cognitoAuthorizerArn}"],
      //   },
      // },
    },
  },
};

module.exports = serverlessConfiguration;

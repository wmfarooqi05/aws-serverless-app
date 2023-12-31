import type { AWS } from "@serverless/typescript";
import * as dotenv from "dotenv";
import allFunctions from "@functions/index";
import { ensureEnvConfigs } from "./env-var-validtors";

var fs = require("fs");
var contents = fs.readFileSync("package.json");
const dependencies: string[] = Object.keys(
  JSON.parse(contents)["devDependencies"]
)
  .concat(...Object.keys(JSON.parse(contents)["dependencies"]))
  .concat(["html-to-text"]);

dotenv.config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });

ensureEnvConfigs();

const serverlessConfiguration: AWS = {
  service: process.env.SERVICE_NAME || "global-employment",
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
      JOBS_TABLE:
        "${self:service}_${self:custom.region}_${self:custom.JOBS_DYNAMO_TABLE}",
      ACCOUNT_ID: "${self:custom.ACCOUNT_ID}",
      APIG_WS_ENDPOINT: "${self:custom.APIG_WS_ENDPOINT}",
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
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    snsTopicArn:
      "arn:aws:sns:${self:provider.region}:${aws:accountId}:email-sns-topic",
    JOBS_DYNAMO_TABLE: process.env.JOBS_DYNAMO_TABLE,
    ACCOUNT_ID: "${aws:accountId}",
    IMAGE_PROCESSING_QUEUE: process.env.IMAGE_PROCESSING_QUEUE,
    APIG_WS_ENDPOINT: {
      "Fn::Join": [
        "",
        [
          "https://",
          { Ref: "WebsocketsApi" },
          ".execute-api.",
          { Ref: "AWS::Region" },
          ".amazonaws.com/",
          "${self:custom.STAGE}",
        ],
      ],
    },
    cognitoAuthorizerArn: "arn:aws:cognito-idp",

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
      compatibleRuntimes: ["nodejs18.x"],
    },
    serverlessOfflineSqs: {
      autoCreate: true,
      apiVersion: "2012-11-05",
      endpoint: "http://0.0.0.0:9324",
      region: "ca-central-1",
      accessKeyId: "root",
      secretAccessKey: "root",
      skipCacheInvalidation: false,
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
    },
  },
};

module.exports = serverlessConfiguration;

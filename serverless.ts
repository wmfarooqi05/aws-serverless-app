import type { AWS } from "@serverless/typescript";
import * as dotenv from "dotenv";
// import allFunctions from "src/sls-config/ca-central-1/functions";
import allFunctions from "@functions/index";

var fs = require("fs");
var contents = fs.readFileSync("package.json");
const dependencies: string[] = Object.keys(
  JSON.parse(contents)["devDependencies"]
).concat(...Object.keys(JSON.parse(contents)["dependencies"]));

dotenv.config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });

const serviceName = "gel-api";

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
      VPC_NAT_GATEWAY_ID: process.env.NAT_GATEWAY_ID,

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
    SCHEDULING_QUEUE: "scheduling-queue-${opt:stage, self:provider.stage}",
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
                Resource: "arn:aws:s3:::my-s3-bucket/my-folder/*",
              },
            ],
          },
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;

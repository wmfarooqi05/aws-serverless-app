import type { AWS } from "@serverless/typescript";

import { getLeads, getLeadById, createLead } from "@functions/leads";
import { authCallback } from "@functions/auth";

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
    timeout: 10,
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
    vpc: {
      securityGroupIds: [
        'sg-0bcaf1e5086effdd5'
      ],
      subnetIds: [
        'subnet-0c87da38c707b23d3',
        'subnet-08b4521bc0da095f4',
        'subnet-0254663a738570f0c',
      ]
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
  functions: { getLeadById, getLeads, createLead, authCallback },
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
      allowCache: true,
      useChildProcesses: true,
    },
    stage: "${opt:stage, self:provider.stage}",
  },
  // resources: {
  //   Resources: {
  //     LeadTable: {
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
  resources: {
    Resources: {
      ApiGatewayAuthorizer: {
        Type: 'AWS::ApiGateway::Authorizer',
        Properties: {
          Name: 'CognitoUserPool',
          Type: 'COGNITO_USER_POOLS',
          IdentitySource: 'method.request.header.Authorization',
          RestApiId: {
            Ref: 'ApiGatewayRestApi'
          },
          ProviderARNs: ["arn:aws:cognito-idp:ca-central-1:524073432557:userpool/ca-central-1_mJllgwkkd"]
        }
      },
      // UserPool: { // this line is name
      //   Type: "AWS::Cognito::UserPool",
      //   Properties:{
      //     "UserPoolName": "Manager_pool"
      //   }
      // }
    }
  }
};

module.exports = serverlessConfiguration;

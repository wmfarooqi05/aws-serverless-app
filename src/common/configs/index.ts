import { CloudFrontClientConfig } from "@aws-sdk/client-cloudfront";
import { S3ClientConfig } from "@aws-sdk/client-s3";
import { SESClientConfig } from "@aws-sdk/client-ses";
import { SQSClientConfig } from "@aws-sdk/client-sqs";

const cfDefaultConfig: CloudFrontClientConfig = {
  region: process.env.REGION,
};
const sqsDefaultConfig: SQSClientConfig = { region: process.env.REGION };
const sesDefaultConfig: SESClientConfig = { region: process.env.REGION };
const s3DefaultConfig: S3ClientConfig = { region: process.env.REGION };
if (process.env.STAGE === "local") {
  cfDefaultConfig.endpoint = "http://localhost:4566";
  sqsDefaultConfig.endpoint = "http://sqs.localhost.localstack.cloud:4566";
  sesDefaultConfig.endpoint = "http://ses.localhost.localstack.cloud:4566";
  s3DefaultConfig.endpoint = "http://s3.localhost.localstack.cloud:4566";
}

export { cfDefaultConfig, sqsDefaultConfig, s3DefaultConfig, sesDefaultConfig };

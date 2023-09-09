import { CloudFrontClientConfig } from "@aws-sdk/client-cloudfront";
import { SESClientConfig } from "@aws-sdk/client-ses";
import { SQSClientConfig } from "@aws-sdk/client-sqs";

export const cfDefaultConfig: CloudFrontClientConfig = { region: process.env.REGION };
export const sqsDefaultConfig: SQSClientConfig = { region: process.env.REGION };
export const sesDefaultConfig: SESClientConfig = { region: process.env.REGION };
if (process.env.STAGE === "local") {
  cfDefaultConfig.endpoint = "http://localhost:4566";
  sqsDefaultConfig.endpoint = "http://localhost:4566";
  sesDefaultConfig.endpoint = "http://localhost:4566";
}

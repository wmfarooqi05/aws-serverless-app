import { CloudFrontClientConfig } from "@aws-sdk/client-cloudfront";
import { SESClientConfig } from "@aws-sdk/client-ses";
import { SQSClientConfig } from "@aws-sdk/client-sqs";

const cfConfig: CloudFrontClientConfig = { region: process.env.REGION };
const sqsConfig: SQSClientConfig = { region: process.env.REGION };
const sesConfig: SESClientConfig = { region: process.env.REGION };
if (process.env.STAGE === "local") {
  cfConfig.endpoint = "http://localhost:4566";
  sqsConfig.endpoint = "http://localhost:4566";
  sesConfig.endpoint = "http://localhost:4566";
}

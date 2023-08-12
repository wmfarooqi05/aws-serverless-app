import "reflect-metadata";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { SQSEvent } from "aws-lambda";
import { SQSService } from "./service";
import { container } from "@common/container";

export const sqsJobQueueInvokeHandler = async (event: SQSEvent) => {
  try {
    // This is for dev testing
    if (process.env.STAGE === "local" && event.body) {
      event.Records = [JSON.parse(event.body)];
    }
    const resp = await container
      .resolve(SQSService)
      .sqsJobQueueInvokeHandler(event.Records);
    return formatJSONResponse({ resp }, 200);
  } catch (error) {
    return formatErrorResponse({
      message: error.message,
      statusCode: 400,
    });
  }
};

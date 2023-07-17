import "reflect-metadata";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { SQSEvent } from "aws-lambda";
import { SQSService } from "./service";
import { container } from "tsyringe";

export const sqsInvokeHandler = async (event) => {
  try {
    const updatedNotification = await container
      .resolve(SQSService)
      .sqsInvokeHandler(event.body);
    return formatJSONResponse(updatedNotification, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const sqsJobQueueInvokeHandler = async (event: SQSEvent) => {
  try {
    // This is for dev testing
    if (process.env.STAGE === "local" && event.body) {
      event.Records = [JSON.parse(event.body)];
    }
    ///////////////////////

    console.log("[sqsJobQueueInvokeHandler]", event);
    const service = container.resolve(SQSService);
    console.log("service", service);
    const resp = await service.sqsJobQueueInvokeHandler(event.Records);
    // console.log("await ended");
    // console.log("resp", resp);
    // const ids = event.Records.filter((x) => x.messageId);
    return formatJSONResponse({ resp }, 200);
  } catch (error) {
    return formatErrorResponse({
      message: error.message,
      statusCode: 400,
    });
  }
};

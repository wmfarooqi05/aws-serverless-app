import "reflect-metadata";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { SQSEvent } from "aws-lambda";
import { SQSService } from "./service";
import { container } from "tsyringe";

export const sqsJobQueueInvokeHandler = async (event: SQSEvent) => {
  try {
    if (event.body) {
      event.Records = [{ body: event.body }];
    }
    console.log("[sqsJobQueueInvokeHandler]", event);
    const service = container.resolve(SQSService);
    console.log("service", service);
    const resp = await service.sqsJobQueueInvokeHandler(event.Records);
    console.log("await ended");
    const ids = event.Records.filter((x) => x.messageId);
    return formatJSONResponse(resp, 200);
    return formatJSONResponse(
      { message: `Job executed properly, Ids: ${ids}` },
      200
    );
  } catch (error) {
    return formatErrorResponse({
      message: error.message,
      statusCode: 400,
    });
  }
};

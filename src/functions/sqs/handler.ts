import "reflect-metadata";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { SQSEvent } from "aws-lambda";
import { SQSService } from "./service";
import { container } from "tsyringe";

export const sqsJobQueueInvokeHandler = async (event: SQSEvent) => {
  try {
    console.log('[sqsJobQueueInvokeHandler]')
    await container.resolve(SQSService).sqsJobQueueInvokeHandler(event.Records);
    const ids = event.Records.filter((x) => x.messageId);
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

import {
  DeleteMessageCommand,
  DeleteMessageCommandOutput,
  GetQueueAttributesCommand,
  SQSClient,
  SendMessageCommand,
  SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import { SQSRecord } from "aws-lambda";

export const sendMessageToSQS = async (
  sqsClient: SQSClient,
  body: any,
  queueUrl = process.env.JOB_QUEUE_NAME
): Promise<SendMessageCommandOutput> => {
  const queueName = queueUrl?.split("/")[-1];
  if (process.env.STAGE === "local") {
    console.log("not enqueuing on local", body);
    return;
  }
  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(body),
    });
    const resp = await sqsClient.send(command);
    console.log(`Message sent to SQS ${queueName} with id ${resp.MessageId}.`);
    return resp;
  } catch (error) {
    console.error(`Error sending message to queue: ${error}`);
  }
};

// Delete a message from a SQS queue
/**
 *
 * @param sqsClient
 * @param record
 * @param queueUrl
 * @returns
 */
export const deleteMessageFromSQS = async (
  sqsClient: SQSClient,
  record: SQSRecord
): Promise<DeleteMessageCommandOutput> => {
  console.log("[deleteMessageFromSQS]");
  if (process.env.STAGE === "local") return;
  try {
    const { eventSourceARN, receiptHandle } = record;
    const { queueName, queueUrl } = sqsQueueUrlFromArn(eventSourceARN);
    console.log("[deleteMessageFromSQS] queueUrl", queueUrl);

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    const resp = await sqsClient.send(command);
    console.log(
      `Message with receipt handle ${receiptHandle} deleted from queue ${queueName}.`
    );
    return resp;
  } catch (error) {
    console.error(`Error deleting message from queue: ${error}`);
  }
};

export const moveMessageToDLQ = async (
  sqsClient: SQSClient,
  record: SQSRecord
) => {
  console.log("[moveMessageToDLQ], recordArn", record.eventSourceARN);
  const { queueUrl } = sqsQueueUrlFromArn(record.eventSourceARN);
  console.log("[moveMessageToDLQ], queueUrl", queueUrl);

  const attributes = await sqsClient.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["RedrivePolicy"],
    })
  );
  console.log("dlq attributes", attributes);
  const redrivePolicy = JSON.parse(attributes.Attributes?.RedrivePolicy || "");
  if (redrivePolicy && redrivePolicy.deadLetterTargetArn) {
    console.log(
      "dlq redrivePolicy.deadLetterTargetArn",
      redrivePolicy.deadLetterTargetArn
    );
    const dlqArn = redrivePolicy.deadLetterTargetArn;
    const { queueUrl: dlqUrl } = sqsQueueUrlFromArn(dlqArn);
    console.log("dlq url", dlqUrl);
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: dlqUrl,
        MessageBody: record.body,
      })
    );
    console.log("message moved to dlq");
  }
};

export const sqsQueueUrlFromArn = (arn: string) => {
  const parts = arn.split(":");

  const service = parts[2];
  const region = parts[3];
  const accountId = parts[4];
  const queueName = parts[5];

  return {
    queueUrl: `https://${service}.${region}.amazonaws.com/${accountId}/${queueName}`,
    queueName,
    region,
  };
};

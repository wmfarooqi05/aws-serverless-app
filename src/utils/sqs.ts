import {
  DeleteMessageCommand,
  DeleteMessageCommandOutput,
  SQSClient,
  SendMessageCommand,
  SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";

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
export const deleteMessageFromSQS = async (
  sqsClient: SQSClient,
  receiptHandle: string,
  queueUrl: string = process.env.JOB_QUEUE_NAME
): Promise<DeleteMessageCommandOutput> => {
  const queueName = queueUrl?.split("/")[-1];
  if (process.env.STAGE === "local") return;
  try {
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

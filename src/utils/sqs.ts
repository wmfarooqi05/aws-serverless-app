import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

// Delete a message from a SQS queue
export const deleteMessageFromSQS = async (
  sqsClient: SQSClient,
  receiptHandle: string,
  queueUrl: string = process.env.JOB_QUEUE_NAME
) => {
  if (process.env.STAGE === "local") return;
  try {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    await sqsClient.send(command);
    console.log(
      `Message with receipt handle ${receiptHandle} deleted from queue.`
    );
  } catch (error) {
    console.error(`Error deleting message from queue: ${error}`);
  }
};

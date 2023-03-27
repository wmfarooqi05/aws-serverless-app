import "reflect-metadata";
import { injectable } from "tsyringe";
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { SQSEvent } from "aws-lambda";
import JobsResultsModel, { IJobsResults } from "@models/JobsResult";
import { CustomError } from "@helpers/custom-error";
import { bulkImportUsersProcess } from "@functions/jobs/bulkSignupProcess";

let queueUrl = `https://sqs.${process.env.REGION}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${process.env.JOB_QUEUE}`;
// let queueUrl =
//   "https://sqs.ca-central-1.amazonaws.com/524073432557/job-queue-dev";
if (process.env.STAGE === "local") {
  queueUrl = "http://localhost:4566/000000000000/job-queue-local";
}

console.log("queueUrl", queueUrl);

@injectable()
export class SQSService {
  sqsClient: SQSClient = null;
  constructor() {
    // this.sqs = new SQS({ region: process.env.REGION });
    if (process.env.STAGE === "local") {
      this.sqsClient = new SQSClient({
        endpoint: "http://localhost:4566", // Replace with the endpoint of your LocalStack instance
        region: "ca-central-1", // Replace with your desired region
        apiVersion: "2012-11-05", // Replace with your desired API version})
      });
    } else {
      this.sqsClient = new SQSClient({
        region: process.env.REGION,
      });
    }
  }

  async sqsJobQueueInvokeHandler(Records: SQSEvent["Records"]) {
    try {
      const promises = Records.map(async (record) => {
        const payload = JSON.parse(record.body);

        const messageBody = JSON.parse(payload);
        if (!messageBody.jobId) {
          throw new CustomError("job id not found", 400);
          return;
        }
        const job: IJobsResults = await JobsResultsModel.query().findById(messageBody.jobId);
        if (job.jobType === 'UPLOAD_COMPANIES_FROM_EXCEL') {
          await bulkImportUsersProcess(job);
        }

        await this.deleteMessage(record.receiptHandle);
      });

      await Promise.all(promises);
    } catch (error) {
      console.error(error);
    }
  }

  async addJobToQueue(jobId: string) {
    try {
      const messageBody = JSON.stringify({ jobId });
      const params = {
        MessageBody: messageBody,
        QueueUrl: queueUrl,
      };

      return this.sendMessage(JSON.stringify(params));
    } catch (e) {
      console.log("error", e);
    }
  }

  // @TODO make these other functions private
  private async sendMessage(messageBody: string) {
    try {
      // return this.sqsClient.send(
      //   new SendMessageCommand({
      //     QueueUrl: queueUrl,
      //     MessageBody: messageBody,
      //   })
      // );
      // console.log("Success, message sent. MessageID:", data.MessageId);
      // return data; // For unit tests.

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      });
      const response = await this.sqsClient.send(command);
      console.log(
        `Message sent to queue with message ID: ${response.MessageId}`
      );
    } catch (error) {
      console.error(`Error sending message to queue: ${error}`);
      return error;
    }
  }

  // Receive messages from a SQS queue
  async receiveMessages(maxNumberOfMessages: number) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
      });
      const response = await this.sqsClient.send(command);
      if (response.Messages) {
        console.log(
          `Received ${response.Messages.length} message(s) from queue:`
        );
        response.Messages.forEach((message) => {
          console.log(
            `Message ID: ${message.MessageId}, Body: ${message.Body}`
          );
          // Delete the message from the queue
          this.deleteMessage(message.ReceiptHandle);
        });
      } else {
        console.log("No messages received from queue.");
      }
    } catch (error) {
      console.error(`Error receiving messages from queue: ${error}`);
    }
  }

  // Delete a message from a SQS queue
  async deleteMessage(receiptHandle: string) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });
      await this.sqsClient.send(command);
      console.log(
        `Message with receipt handle ${receiptHandle} deleted from queue.`
      );
    } catch (error) {
      console.error(`Error deleting message from queue: ${error}`);
    }
  }
}

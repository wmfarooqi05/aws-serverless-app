import "reflect-metadata";
import { container, injectable } from "tsyringe";
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { SQSEvent } from "aws-lambda";
// import JobsModel, { IJobs } from "@models/pending/[x]Jobs";
import { CustomError } from "@helpers/custom-error";
import { bulkImportUsersProcessHandler } from "@functions/jobs/bulkSignupProcess";
import {
  IEmailSqsEventInput,
  IJobSqsEventInput,
  I_SQS_EVENT_INPUT,
  SQSEventType,
} from "@models/interfaces/Reminders";
import { IEBSchedulerEventInput } from "@models/interfaces/Reminders";
import { ReminderService } from "@functions/reminders/service";
import { EmailService } from "@functions/emails/service";

let queueUrl = `https://sqs.${process.env.REGION}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${process.env.JOB_QUEUE}`;
// let queueUrl =
//   "https://sqs.ca-central-1.amazonaws.com/524073432557/job-queue-dev";
if (process.env.STAGE === "local" && process.env.USE_LOCAL_SQS === "true") {
  queueUrl = "http://localhost:4566/000000000000/job-queue-local";
}

@injectable()
export class SQSService {
  sqsClient: SQSClient = null;
  constructor() {
    if (process.env.STAGE === "local" && process.env.USE_LOCAL_SQS === "true") {
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
      const deleteEvent = [];
      console.log("[sqsJobQueueInvokeHandler] records", Records);
      const promises = Records.map(async (record) => {
        // const jobItem = JobsModel.query()
        // .where(
        //   "details->>'sqsPayload.MessageId'",
        //   record.messageId
        // ).first();

        console.log("[sqsJobQueueInvokeHandler] record", record);

        // BULK SIGNUP will look like this
        // const message: { MessageBody: I_SQS_EVENT_INPUT; QueueUrl: string } =
        //   JSON.parse(record.body);
        const payload: I_SQS_EVENT_INPUT = JSON.parse(record.body);
        console.log("payload", payload);
        deleteEvent.push(this.deleteMessage(record.receiptHandle));

        if (payload.Type === "Notification" && payload.MessageId) {
          return container.resolve(EmailService).receiveEmailHelper(record);
        } else if (payload.eventType === "REMINDER") {
          return this.reminderSqsEventHandler(payload);
        } else if (payload.eventType === "SEND_EMAIL") {
          return this.emailSqsEventHandler(payload);
        } else if (payload.eventType === "JOB") {
          return this.jobSqsEventHandler(payload);
        } else if (payload?.MessageBody.eventType === "BULK_SIGNUP") {
          return bulkImportUsersProcessHandler(payload?.MessageBody?.jobId);
        } else if (payload?.MessageBody.eventType === "BULK_EMAIL") {
          return this.bulkEmailSqsEventHandler(payload);
        }
      });

      const resps = await Promise.all(promises);
      console.log("resps", resps);
      await Promise.all(deleteEvent);
      return resps;
    } catch (error) {
      console.error(error);
    }
  }

  bulkEmailSqsEventHandler(payload) {
    // const emailPromises =
  }

  async emailSqsEventHandler(record: IEmailSqsEventInput) {
    console.log("[emailSqsEventHandler]", record);
    return container.resolve(EmailService).sqsEmailHandler(record);
  }

  async reminderSqsEventHandler(input: IEBSchedulerEventInput) {
    return container.resolve(ReminderService).handleEBSchedulerInvoke(input);
  }

  async jobSqsEventHandler(input: IJobSqsEventInput) {
    if (!input.jobId) {
      throw new CustomError("job id not found", 400);
      return;
    }
    // const job: IJobs = await JobsModel.query().findById(
    //   input.jobId
    // );
    // if (job.jobType === "UPLOAD_COMPANIES_FROM_EXCEL") {
    //   await bulkImportUsersProcess(job);
    // }
  }

  async addJobToQueue(
    jobId: string,
    eventType: SQSEventType,
    queueUrl: string = "https://sqs.ca-central-1.amazonaws.com/524073432557/job-queue-dev"
  ) {
    try {
      const params = {
        MessageBody: { jobId, eventType },
        QueueUrl: queueUrl,
      };

      return this.sendMessage(JSON.stringify(params), queueUrl);
    } catch (e) {
      console.log("error", e);
    }
  }

  // @TODO make these other functions private
  private async sendMessage(
    messageBody: string,
    queueUrl: string = "https://sqs.ca-central-1.amazonaws.com/524073432557/job-queue-dev"
  ) {
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

  async enqueueItems(item: any) {
    try {
      const sendMessageCommand = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(item),
      });

      // Send the message using the SQS client
      return this.sqsClient.send(sendMessageCommand);
    } catch (error) {
      console.error(`Error during enqueue: ${error}`);
    }
  }
}

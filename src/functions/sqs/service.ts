import "reflect-metadata";
import { container, inject, injectable } from "tsyringe";
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
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  EMAIL_ADDRESSES_TABLE,
  EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE,
  EMAIL_LIST_TABLE,
} from "@functions/emails/models/commons";
import JobsModel, { IJobData, JOB_STATUS } from "@models/dynamoose/Jobs";
import {
  IEmailAddress,
  I_BULK_EMAIL_JOB,
  I_BULK_EMAIL_JOB_DETAILS,
  I_BULK_EMAIL_JOB_PREPARE,
} from "@functions/emails/models/interfaces/bulkEmail";
import {
  IEmailAddressToEmailListModel,
  IEmployeeAddressToEmailList,
} from "@functions/emails/models/EmailAddressToEmailList";
import { chunk, random } from "lodash";
import { IEmailAddresses } from "@functions/emails/models/EmailAddresses";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { x } from "joi";
import { randomUUID } from "crypto";
import { IWithPagination } from "knex-paginate";
import { bulkEmailPrepareSqsEventHandler } from "./jobs/bulkEmailPrepareSqsEventHandler";
import { bulkEmailSqsEventHandler } from "./jobs/bulkEmailSqsEventHandler";

let queueUrl = `https://sqs.${process.env.REGION}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${process.env.JOB_QUEUE}`;
// let queueUrl =
//   "https://sqs.ca-central-1.amazonaws.com/524073432557/job_queue_dev";
if (process.env.STAGE === "local" && process.env.USE_LOCAL_SQS === "true") {
  queueUrl = "http://localhost:4566/000000000000/job-queue-local";
}

@injectable()
export class SQSService {
  sqsClient: SQSClient = null;
  dynamoDBClient: DynamoDBClient = null;
  emailDbClient: DatabaseService = null;
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {
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
      this.emailDbClient = this.docClient;
    }

    this.dynamoDBClient = new DynamoDBClient({ region: process.env.REGION });
  }

  async sqsJobQueueInvokeHandler(Records: SQSEvent["Records"]) {
    for (const record of Records) {
      try {
        console.log("[sqsJobQueueInvokeHandler] records", Records);
        const promises = [];
        console.log("[sqsJobQueueInvokeHandler] record", record);
        const payload: I_SQS_EVENT_INPUT = JSON.parse(record.body);
        console.log("payload", payload);

        const jobItem: IJobData = await JobsModel.get({
          jobId: payload.MessageBody.jobId,
        });

        if (jobItem.jobStatus === "SUCCESSFUL") {
          console.log(
            `Message ${record.messageId} has already been processed. Skipping...`
          );
          continue;
        }

        if (!this.emailDbClient) {
          this.emailDbClient = this.docClient;
        }

        let resp = null;
        if (payload.Type === "Notification" && payload.MessageId) {
          resp = await container
            .resolve(EmailService)
            .receiveEmailHelper(record);
        } else if (payload.eventType === "REMINDER") {
          resp = await this.reminderSqsEventHandler(payload);
        } else if (payload.eventType === "SEND_EMAIL") {
          resp = await this.emailSqsEventHandler(payload);
        } else if (payload.eventType === "JOB") {
          resp = await this.jobSqsEventHandler(payload);
        } else if (payload?.MessageBody.eventType === "BULK_SIGNUP") {
          resp = await bulkImportUsersProcessHandler(jobItem);
        } else if (payload?.MessageBody.eventType === "BULK_EMAIL_PREPARE") {
          resp = await bulkEmailPrepareSqsEventHandler(
            this.emailDbClient,
            jobItem
          );
        } else if (payload?.MessageBody.eventType === "BULK_EMAIL") {
          resp = await bulkEmailSqsEventHandler(
            this.emailDbClient,
            this.sqsClient,
            jobItem
          );
        }

        // For Email jobs, we will be using different lambda due to layers

        await this.markMessageProcessed(payload.MessageBody.jobId, resp);
        // await this.deleteMessage(record.receiptHandle);
      } catch (error) {
        console.error(error);
        await this.addErrorToMessage(record.receiptHandle, error);
        return formatErrorResponse(error);
        // Push to DLQ or set job
      }
    }
  }

  async addErrorToMessage(receiptHandle: string, error: Error) {}

  async sqsBulkEmailPrepareHandler(payload) {
    // this.emailDbClient.getKnexClient()(EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE).where({
    //   emailListId: payload.
    // })
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
    queueUrl: string = "https://sqs.ca-central-1.amazonaws.com/524073432557/job_queue_dev"
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
    queueUrl: string = "https://sqs.ca-central-1.amazonaws.com/524073432557/job_queue_dev"
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
      return response;
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

  async isMessageProcessed(jobId: string): Promise<boolean> {
    const jobItem: IJobData = await JobsModel.get({ jobId });
    return jobItem.jobStatus === "SUCCESSFUL";
  }

  async markMessageProcessed(jobId: string, resp: any): Promise<void> {
    await JobsModel.update(
      { jobId },
      {
        jobStatus: "SUCCESSFUL" as JOB_STATUS,
        result: { jobIds: resp },
      }
    );
    // const putCommand = new PutItemCommand({
    //   TableName: process.env.JOBS_DYNAMO_TABLE,
    //   Item: {
    //     messageId: { S: messageId },
    //     result: { S: result },
    //   },
    // });

    // await this.dynamoDBClient.send(putCommand);
  }
}

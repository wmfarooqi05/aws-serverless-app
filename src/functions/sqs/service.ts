import "reflect-metadata";
import { inject, singleton } from "tsyringe";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SQSEvent } from "aws-lambda";
// import JobsModel, { IJobs } from "@models/pending/[x]Jobs";
import { bulkImportUsersProcessHandler } from "@functions/jobs/bulkSignupProcess";
import { SQSEventType } from "@models/interfaces/Reminders";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";
import { deleteMessageFromSQS, moveMessageToDLQ } from "@utils/sqs";
import { deleteS3Files } from "./jobs/deleteS3Files";
import {
  deleteGoogleMeeting,
  scheduleGoogleMeeting,
} from "./jobs/scheduleGoogleMeeting";
import JobsModel, { IJob } from "@models/Jobs";
import { createEBScheduler, deleteEbScheduler } from "./jobs/ebScheduler";
import { sqsDefaultConfig } from "@common/configs";
import JobExecutionHistoryModel, {
  IJobExecutionData,
} from "@models/JobExecutionHistory";

@singleton()
export class SQSService {
  sqsClient: SQSClient = null;
  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {
    this.sqsClient = new SQSClient(sqsDefaultConfig);
  }

  async sqsJobQueueInvokeHandler(Records: SQSEvent["Records"]) {
    for (const record of Records) {
      let jobItem: IJob = {};
      try {
        console.log("[sqsJobQueueInvokeHandler] record", record);
        const payload: IJob = JSON.parse(record.body);
        console.log("payload", payload);

        const jobId = payload.id;

        const { jobItem: newJobItem, jobCurrentExecutionItem } =
          await JobsModel.addExecutionHistory(jobId);

        jobItem = newJobItem;

        if (jobItem.jobStatus === "SUCCESSFUL") {
          console.info(
            `Message ${record.messageId} has already been processed. Skipping...`
          );
          return;
        }
        /**
         * We are here taking a decision
         * that jobs failed inside processing will be treated as successful
         * because if 3rd party is crashing, like google meet, then
         * user should restart the job after fixing the issue e.g. refresh token
         *
         * but for aws related things like delete s3 files, schedule reminder,
         * failing inside processing will be treated as failed job
         * but user will be notified about this as well and record's details will
         * also be updated
         */

        let resp: IJobExecutionData = null;
        if (jobItem?.jobType === "BULK_SIGNUP") {
          resp = await bulkImportUsersProcessHandler(jobItem);
        } else if (jobItem.jobType === "DELETE_S3_FILES") {
          resp = await deleteS3Files(jobItem);
        } else if (jobItem.jobType === "ADD_GOOGLE_MEETING") {
          resp = await scheduleGoogleMeeting(jobItem);
        } else if (jobItem.jobType === "DELETE_GOOGLE_MEETING") {
          resp = await deleteGoogleMeeting(jobItem);
        } else if (jobItem.jobType === "CREATE_EB_SCHEDULER") {
          resp = await createEBScheduler(jobItem);
        } else if (jobItem.jobType === "DELETE_EB_SCHEDULER") {
          resp = await deleteEbScheduler(jobItem);
        }

        // For Email jobs, we will be using different lambda due to layers
        await JobExecutionHistoryModel.query().patchAndFetchById(
          jobCurrentExecutionItem.id,
          resp
        );
        if (resp.jobStatus === "FAILED") {
          await moveMessageToDLQ(this.sqsClient, record);
        }
      } catch (error) {
        console.error(error);
        if (jobItem?.lastExecutedJobId) {
          await JobExecutionHistoryModel.query().patchAndFetchById(
            jobItem?.lastExecutedJobId,
            {
              message: error.message,
              statusCode: error.statusCode,
              stack: error.stack,
            }
          );
        }
        if (process.env.STAGE === "local") {
          continue;
        }

        // We dont need as we have DLQ
        // const key = `jobs/unprocessed-events/catch/${randomUUID()}`;
        // const s3Resp = await uploadContentToS3(key, JSON.stringify(record));
        // console.log("uploaded to s3", s3Resp);
        // Push to DLQ or set job
        await moveMessageToDLQ(this.sqsClient, record);
      } finally {
        await deleteMessageFromSQS(this.sqsClient, record);
      }
    }
  }

  async addErrorToMessage(receiptHandle: string, error: Error) {}

  async sqsBulkEmailPrepareHandler(payload) {
    // this.emailDbClient.getKnexClient()(EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE).where({
    //   emailListId: payload.
    // })
  }

  async addJobToQueue(jobId: string, eventType: SQSEventType) {
    try {
      let queueUrl =
        "https://sqs.ca-central-1.amazonaws.com/524073432557/job_queue_dev";

      if (
        eventType === "PROCESS_TEMPLATE" ||
        eventType === "BULK_EMAIL" ||
        eventType === "BULK_EMAIL_PREPARE"
      ) {
        queueUrl =
          "https://sqs.ca-central-1.amazonaws.com/524073432557/EmailQueue";
      }

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

  async isMessageProcessed(jobId: string): Promise<boolean> {
    const jobItem: IJobData = await JobsModel.get({ jobId });
    return jobItem.jobStatus === "SUCCESSFUL";
  }

  /** @deprecated */
  async markJobAsSuccessful(jobId: string, resp): Promise<void> {
    await JobsModel.query()
      .findById(jobId)
      .patch({
        jobStatus: "SUCCESSFUL",
        jobResult: resp,
      } as IJob);
    console.log(`marked jobId ${jobId} as successful`);
  }

  /** @deprecated */
  async markJobAsFailed(job: IJob, resp: any): Promise<void> {
    const result = job.jobResult || {};
    const errorObj = {
      error: (resp && JSON.stringify(resp)) || "An error occurred",
      updatedAt: moment().utc().format(),
    };
    console.log("job failed errorObj", errorObj);
    if (result?.errors?.length) {
      result.errors.push(errorObj);
    } else {
      result.errors = [errorObj];
    }
    await JobsModel.query()
      .findById(job.id)
      .patch({
        jobStatus: "FAILED",
        jobResult: result,
      } as IJob);
    console.log("marked job as failed");
  }

  async markSQSMessageAsFailed(rec): Promise<void> {}
}

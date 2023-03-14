import "reflect-metadata";
import {
  inject,
  injectable,
} from "tsyringe";
import {
  SchedulerClient,
  CreateScheduleCommand,
  CreateScheduleCommandInput,
  DeleteScheduleCommand,
  DeleteScheduleCommandInput,
} from "@aws-sdk/client-scheduler";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { randomUUID } from "crypto";
import ReminderModel, { IReminder, ReminderStatus } from "src/models/Reminders";
import moment from "moment-timezone";
import { DatabaseService } from "@libs/database/database-service-objection";

export interface IReminderService {}

export interface ReminderEBSchedulerPayload {
  reminderTime: string;
  eventType: string; //ReminderType;
  name: string;
  data?: any;
}

@injectable()
export class ReminderService implements IReminderService {
  schedulerClient: SchedulerClient = null;
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {
    this.initializeScheduler();
  }

  initializeScheduler() {
    this.schedulerClient = new SchedulerClient({
      region: process.env.AWS_SCHEDULER_REGION,
    });
  }

  async ScheduleReminder(body) {
    const payload = JSON.parse(body);
    const params: ReminderEBSchedulerPayload = {
      reminderTime: payload.reminderTime,
      name: `Reminder-${randomUUID()}`,
      eventType: "reminder",
      // We are going to store reminders logic in activity
      // when creating activity, it will create reminders entries, with proper timings
      // reminder module will only schedule reminder, no dealing with logic
      // eventType: "ReminderType.Reminder_24H_Before",
      data: { id: "123", name: "waleed", type: "alarm", ...payload },
    };

    const target: AWS.Scheduler.Target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN!,
      Arn: process.env.REMINDER_TARGET_LAMBDA!,
      Input: JSON.stringify(params),
    };

    const input: CreateScheduleCommandInput = {
      Name: params.name,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      Target: target,
      ScheduleExpression: `at(${params.reminderTime})`,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
      ClientToken: randomUUID(),
    };

    const command: CreateScheduleCommand = new CreateScheduleCommand(input);
    return this.schedulerClient.send(command);
  }

  async CancelReminder() {}

  async SendReminderEmail() {}

  async SendReminderSMS() {}

  async SendReminderWebPushNotification() {}

  // Delete all reminders
  async dailyReminderCleanup() {
    const errorLogsPath = `logs/reminder-cleanup/${randomUUID()}.json`;
    const errorDoc: object[] = [];
    let errorIndex = 0;
    try {
      const reminders: IReminder[] = await ReminderModel.query()
        .whereIn("status", [
          ReminderStatus.SENT,
          ReminderStatus.CANCELLED,
          ReminderStatus.ERROR_CLEANUP,
        ])
        .andWhere("reminderTime", "<", moment().utc().format());
      const reminderDeleteArr = reminders.map((x: IReminder) =>
        this.deleteScheduledReminder(x.reminderAwsId)
      );
      const settledPromises = await Promise.allSettled(reminderDeleteArr);
      errorDoc[errorIndex++] = settledPromises.map((x, i) => {
        return { ...x, rowId: reminders[i].id };
      });

      const dbUpdateResponse = settledPromises.map(
        async (x: PromiseSettledResult<any>, index: number) => {
          const patchObject: Partial<IReminder> = {
            status: ReminderStatus.DONE,
          };
          if (x.status === "rejected") {
            patchObject.status = ReminderStatus.ERROR_CLEANUP;
            patchObject.data = reminders[index].data;
            patchObject.data["error"] = x.reason;
          }
          return ReminderModel.query()
            .patch(patchObject)
            .where({ id: reminders[index].id });
        }
      );

      const dbSettledPromises = await Promise.allSettled(dbUpdateResponse);
      if (dbSettledPromises.filter((x) => x.status === "rejected").length > 0) {
        errorDoc[errorIndex++] = dbSettledPromises;
      }
    } catch (error) {
      errorDoc[errorIndex++] = error;
    } finally {
      if (errorIndex > 0) {
        const resp = await this.uploadToS3(errorLogsPath, errorDoc);
        console.log("s3resp", resp);
        return resp;
      }
    }
  }

  async deleteScheduledReminder(Name: string) {
    const input: DeleteScheduleCommandInput = {
      Name,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
    };

    const command = new DeleteScheduleCommand(input);

    return this.schedulerHelper(command);
  }

  async enqueueJobsForReminders() {
    /**
     * We have to enqueue jobs
     * tasks, phone calls, email, meetings, cleanup
     *
     */
  }

  private async schedulerHelper(command) {
    try {
      return this.schedulerClient.send(command);
    } catch (error) {
      const { requestId, cfId, extendedRequestId, httpStatusCode } =
        error.$metadata;
      console.log({ requestId, cfId, extendedRequestId, httpStatusCode });
      return {
        status: "Error",
        details: {
          statusName: error.name,
          statusMessage: error.specialKeyInException,
          statusCode: httpStatusCode,
        },
      };
    }
  }
  // no need for this
  /** @deprecated */
  private async createSchedulerHelper(params: ReminderEBSchedulerPayload) {
    const target: AWS.Scheduler.Target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN!,
      Arn: process.env.REMINDER_TARGET_LAMBDA!,
      Input: JSON.stringify(params),
    };

    const input: CreateScheduleCommandInput = {
      Name: params.name,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      Target: target,
      ScheduleExpression: `at(${params.reminderTime})`,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
      ClientToken: randomUUID(),
    };

    const command: CreateScheduleCommand = new CreateScheduleCommand(input);
    const result = await this.schedulerClient.send(command);

    // const result = await this.schedulerClient
    //   .createSchedule(schedulerInput)
    //   .promise();

    // return result;
  }

  private async stopExecution(
    Name: string,
    GroupName: string,
    ClientToken: string
  ) {
    const ebScheduler = new AWS.Scheduler({
      region: process.env.AWS_SCHEDULER_REGION,
    });
    return ebScheduler
      .deleteSchedule({ Name, GroupName, ClientToken })
      .promise();
  }

  private getRegionFromArn(arn: string) {
    try {
      return arn.split(":")[3];
    } catch (e) {
      console.log("Could not get region from ARN. ", e);
    }
  }

  /**
   * Move this to S3 Helper Service
   */
  private async uploadToS3(Key: string, body: object) {
    console.log("upload to s3");
    const client: S3Client = new S3Client({
      region: process.env.REGION,
    });

    const command: PutObjectCommand = new PutObjectCommand({
      Bucket: process.env.DEPLOYMENT_BUCKET,
      Key,
      Body: JSON.stringify(body),
    });
    return client.send(command);
  }
}

import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import {
  SchedulerClient,
  CreateScheduleCommand,
  CreateScheduleCommandInput,
  DeleteScheduleCommand,
  DeleteScheduleCommandInput,
  Target,
  CreateScheduleCommandOutput,
} from "@aws-sdk/client-scheduler";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import http from "http";

import { randomUUID } from "crypto";
import ReminderModel, {
  IReminder,
  ReminderStatus,
  ReminderTimeType,
  ReminderType,
} from "src/models/Reminders";
import moment from "moment-timezone";
import { DatabaseService } from "@libs/database/database-service-objection";
import { IReminderInterface } from "@models/interfaces/Activity";

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

  // for internal service
  async scheduleReminders(
    remindersPayload: IReminderInterface["overrides"],
    dueDate: string,
    activityId: string,
    type: ReminderTimeType
  ) {
    const reminderResp = [];
    try {
      for (let i = 0; i < remindersPayload.length; i++) {
        const { minutes, method } = remindersPayload[0];
        const reminderTime = moment(dueDate)
          .utc()
          .subtract(minutes, "minutes")
          .format("YYYY-MM-DDTHH:mm:ss");
        // 2022-11-01T11:00:00
        // .format("YYYY-MM-DDTHH:mm:ssZ");
        console.log("reminderTime", reminderTime);
        const reminderObj: IReminder = await ReminderModel.query().insert({
          activityId,
          reminderTime,
          type,
        });
        const data = {
          activityId,
          method,
          dueDate,
          type,
          reminderId: reminderObj.id,
        };
        const awsEBSItem = await this.createEBSchedulerHelper(
          reminderTime,
          data
        );
        reminderResp.push(awsEBSItem);

        await ReminderModel.query().patchAndFetchById(reminderObj.id, {
          executionArn: awsEBSItem.output.ScheduleArn,
          reminderAwsId: awsEBSItem.awsEBSItemId,
          reminderTime,
          type,
          data: { ...data, jobData: awsEBSItem },
          status: awsEBSItem.output.$metadata.httpStatusCode.toString(),
        });
      }
    } catch (e) {
      reminderResp.push(e);
    } finally {
      return reminderResp;
    }
  }

  async createReminderObjects(
    reminderItem: [
      {
        reminderId: string;
        output: CreateScheduleCommandOutput;
      }
    ]
  ) {
    remindersItems.push({
      activityId,
      executionArn: reminderItem.output.ScheduleArn,
      reminderAwsId: reminderItem.reminderId,
      reminderTime: time,
      reminderTimeType: ReminderTimeType.CUSTOM,
      data,
      status:
        reminderItem.output.$metadata.httpStatusCode === 200
          ? "SCHEDULED"
          : "ERROR",
      type: ReminderType.GENERAL,
    });
  }
  // check if this is required?
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
      ScheduleExpression: `at("${params.reminderTime}")`,
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

  private async createEBSchedulerHelper(
    reminderTime: string,
    data: any
  ): Promise<{ awsEBSItemId: string; output: CreateScheduleCommandOutput }> {
    const awsEBSItemId = randomUUID();
    const params = {
      reminderTime,
      name: `Reminder-${awsEBSItemId}`,
      eventType: "REMINDER",
      data,
    };
    const target: Target = {
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
      ScheduleExpression: `at(${reminderTime})`,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
      ClientToken: awsEBSItemId,
    };

    const command: CreateScheduleCommand = new CreateScheduleCommand(input);
    const output = await this.schedulerClient.send(command);

    return { awsEBSItemId, output };
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

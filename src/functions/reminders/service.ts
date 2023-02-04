import "reflect-metadata";
// import { DatabaseService } from "../../libs/database/database-service-objection";
import {
  injectable,
  // inject
} from "tsyringe";
import AWS from "aws-sdk";
import { randomUUID } from "crypto";
import momentTz from "moment-timezone";
import ReminderModel from "src/models/Reminders";

export interface IReminderService {}

export interface ReminderEBSchedulerPayload {
  reminderTime: string;
  eventType: ReminderType;
  name: string;
  data?: any;
}

@injectable()
export class ReminderService implements IReminderService {
  constructor(private scheduler: AWS.Scheduler) {
    this.scheduler = new AWS.Scheduler({
      region: process.env.AWS_SCHEDULER_REGION,
    });
  }

  async ScheduleReminder() {

    const reminder = await ReminderModel.query().find({
      
    });
    const params: ReminderEBSchedulerPayload = {
      reminderTime: momentTz().utc().format(),
      name: `Reminder-${randomUUID()}`,
      eventType: ReminderType.Reminder_24H_Before,
    };

    const response = await this.createSchedulerHelper(params);

    if (response.statusCode == 200) {
      // db update row
      return { status: "Success" };
    } else {
      // db update
      return {
        status: "Error",
        details: {
          statusMessage: response.statusMessage,
          statusCode: response.statusCode,
        },
      };
    }
  }

  async CancelReminder() {}

  async SendReminderEmail() {}

  async SendReminderSMS() {}

  async SendReminderWebPushNotification() {}

  // Delete all reminders
  async dailyReminderCleanup() {}

  async deleteScheduledReminder(Name: string) {
    const schedulerInput: AWS.Scheduler.DeleteScheduleInput = {
      Name,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
    };

    console.log("Deleting reminder");

    const res = await this.scheduler.deleteSchedule(schedulerInput).promise();

    console.log(res.$response);
  }

  async enqueueJobsForReminders() {
    /**
     * We have to enqueue jobs
     * tasks, phone calls, email, meetings, cleanup
     *
     */
  }

  private async createSchedulerHelper(
    params: ReminderEBSchedulerPayload
  ): Promise<AWS.HttpResponse> {
    const target: AWS.Scheduler.Target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN!,
      Arn: process.env.REMINDER_TARGET_ARN!,
      Input: JSON.stringify(params),
    };

    const schedulerInput: AWS.Scheduler.CreateScheduleInput = {
      Name: params.name,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      Target: target,
      ScheduleExpression: `at(${params.reminderTime})`,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME!,
      ClientToken: randomUUID(),
    };

    const result = await this.scheduler
      .createSchedule(schedulerInput)
      .promise();

    return result.$response.httpResponse;
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
}

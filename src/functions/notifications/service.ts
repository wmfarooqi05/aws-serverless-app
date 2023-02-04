import "reflect-metadata";
// import { DatabaseService } from "../../libs/database/database-service-objection";
import {
  injectable,
  // inject
} from "tsyringe";
import AWS from "aws-sdk";
import { randomUUID } from "crypto";
import momentTz from "moment-timezone";
import NotificationModel from "src/models/Notifications";

export interface INotificationService {}

export interface NotificationEBSchedulerPayload {
  notificationTime: string;
  eventType: NotificationType;
  name: string;
  data?: any;
}

@injectable()
export class NotificationService implements INotificationService {
  constructor(private scheduler: AWS.Scheduler) {
    this.scheduler = new AWS.Scheduler({
      region: process.env.AWS_SCHEDULER_REGION,
    });
  }

  async ScheduleNotification() {

    const notification = await NotificationModel.query().find({
      
    });
    const params: NotificationEBSchedulerPayload = {
      notificationTime: momentTz().utc().format(),
      name: `Notification-${randomUUID()}`,
      eventType: NotificationType.Notification_24H_Before,
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

  async CancelNotification() {}

  async SendNotificationEmail() {}

  async SendNotificationSMS() {}

  async SendNotificationWebPushNotification() {}

  // Delete all notifications
  async dailyNotificationCleanup() {}

  async deleteScheduledNotification(Name: string) {
    const schedulerInput: AWS.Scheduler.DeleteScheduleInput = {
      Name,
      GroupName: process.env.NOTIFICATION_SCHEDULER_GROUP_NAME!,
    };

    console.log("Deleting notification");

    const res = await this.scheduler.deleteSchedule(schedulerInput).promise();

    console.log(res.$response);
  }

  async enqueueJobsForNotifications() {
    /**
     * We have to enqueue jobs
     * tasks, phone calls, email, meetings, cleanup
     *
     */
  }

  private async createSchedulerHelper(
    params: NotificationEBSchedulerPayload
  ): Promise<AWS.HttpResponse> {
    const target: AWS.Scheduler.Target = {
      RoleArn: process.env.NOTIFICATION_TARGET_ROLE_ARN!,
      Arn: process.env.NOTIFICATION_TARGET_ARN!,
      Input: JSON.stringify(params),
    };

    const schedulerInput: AWS.Scheduler.CreateScheduleInput = {
      Name: params.name,
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
      Target: target,
      ScheduleExpression: `at(${params.notificationTime})`,
      GroupName: process.env.NOTIFICATION_SCHEDULER_GROUP_NAME!,
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

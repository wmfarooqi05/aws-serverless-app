import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import NotificationModel, { INotification } from "@models/Notification";
import { CustomError } from "@helpers/custom-error";
import { WebSocketService } from "@functions/websocket/service";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { DatabaseService } from "@libs/database/database-service-objection";
import { validateGetNotifications } from "./schema";
import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";

export interface INotificationService {}

export interface NotificationEBSchedulerPayload {
  // notificationTime: string;
  // eventType: NotificationType;
  // name: string;
  // data?: any;
}

@injectable()
export class NotificationService implements INotificationService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(WebSocketService)
    private readonly webSocketService: WebSocketService // private scheduler: AWS.Scheduler
  ) {
    //   this.scheduler = new AWS.Scheduler({
    //     region: process.env.AWS_SCHEDULER_REGION,
    //   });
  }

  /**
   * Here, employee will request for a creating a notification
   * It will decide on basis of some logic to which modules, it should be sent.
   * First it will create a notification item in DB. It will have module which relates to this notification.
   * There will be X type of notifications. Like Actionable Notification, InfoNotif
   * In actionable notif, we will have pattern somehow similar to pendingapproval
   * It will have type "ACTIONABLE_NOTIFICATION", extraData will have
   * module as "PENDING_APPROVAL", rowId "123". So frontend will simply fetch pending_approval->row123
   * For module we will have a map where "PENDING_APPROVAL" will map to PendingService Instance.
   * Other example can be of Info Notif, "Employee_A changed status of activity to X". It will have extra
   * data of module "Activity", rowId of activity, and on click we will show employee detailed activity.
   * next, it will have
   *
   * @returns
   */
  async createNotification(body: INotification) {
    // const payload = JSON.parse(body);
    // validateNotifPayload
    const {
      title,
      notificationType,
      extraData,
      isScheduled,
      senderEmployee,
      receiverEmployee,
      subtitle,
    } = body;
    // maybe we will take receive employee by running a loop on DB? here or maybe in parent service
    // for multiple receiver we will create an entry for each of them to tackle `read` status issue
    const notificationPayload: INotification = {
      // @TODO we will create title
      title,
      notificationType,
      readStatus: false,
      extraData,
      isScheduled,
      senderEmployee,
      receiverEmployee,
      subtitle,
    };

    // const { senderEmployee, receiverEmployee }: { senderEmployee: any; receiverEmployee: any } = req.body
    return NotificationModel.query().insert(notificationPayload);
  }

  async createNotifications(notifications: INotification[]) {
    return NotificationModel.query().insert(notifications);
  }

  async getNotifications(employee: IEmployeeJwt, body) {
    await validateGetNotifications(body || {});
    const { readStatus, returningFields } = body;

    const whereClause: any = {};

    return this.docClient
      .getKnexClient()(NotificationModel.tableName)
      .select(
        sanitizeColumnNames(NotificationModel.columnNames, returningFields)
      )
      .where(whereClause)
      .where((builder) => {
        builder.where({ receiverEmployee: employee.sub });
        if (readStatus) {
          builder.whereRaw(`details->>'readStatus' = ${readStatus}`);
        }
      })
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async getNotificationById(employeeId: string, id: string) {
    // @TODO add auth guard
    const notifItem: INotification = await NotificationModel.query().findById(
      id
    );
    if (notifItem.receiverEmployee !== employeeId) {
      throw new CustomError(
        "The notification doesn't belongs to this employee",
        403
      );
    }
    return notifItem;
  }

  async updateNotificationsReadStatus(body) {
    const payload = JSON.parse(body);
    // @todo add validator JOI
    await this.updateNotificationsReadStatus(payload);

    const response = await NotificationModel.query()
      .patch({
        read: payload.readStatus,
      })
      .whereIn("id", payload.ids);
    return response;
  }

  /**
   * @TODO replace this function with SQS in future
   * SQS will enqueue request, and then send websocket notification
   */
  async sendWebSocketNotification(notifications: INotification[]) {
    // @TODO add Joi validation
    return this.webSocketService.sendNotifications(notifications);
  }

  // async ScheduleNotification() {
  //   const params: NotificationEBSchedulerPayload = {
  //     notificationTime: momentTz().utc().format(),
  //     name: `Notification-${randomUUID()}`,
  //     eventType: "NotificationType.Notification_24H_Before",
  //   };

  //   const response = await this.createSchedulerHelper(params);

  //   if (response.statusCode == 200) {
  //     // db update row
  //     return { status: "Success" };
  //   } else {
  //     // db update
  //     return {
  //       status: "Error",
  //       details: {
  //         statusMessage: response.statusMessage,
  //         statusCode: response.statusCode,
  //       },
  //     };
  //   }
  // }

  // async CancelNotification() {}

  // async SendNotificationEmail() {}

  // async SendNotificationSMS() {}

  // async SendNotificationWebPushNotification() {}

  // // Delete all notifications
  // async dailyNotificationCleanup() {}

  // async deleteScheduledNotification(Name: string) {
  //   const schedulerInput: AWS.Scheduler.DeleteScheduleInput = {
  //     Name,
  //     GroupName: process.env.NOTIFICATION_SCHEDULER_GROUP_NAME!,
  //   };

  //   console.log("Deleting notification");

  //   const res = await this.scheduler.deleteSchedule(schedulerInput).promise();

  //   console.log(res.$response);
  // }

  // async enqueueJobsForNotifications() {
  //   /**
  //    * We have to enqueue jobs
  //    * tasks, phone calls, email, meetings, cleanup
  //    *
  //    */
  // }

  // private async createSchedulerHelper(
  //   params: NotificationEBSchedulerPayload
  // ): Promise<AWS.HttpResponse> {
  //   const target: AWS.Scheduler.Target = {
  //     RoleArn: process.env.NOTIFICATION_TARGET_ROLE_ARN!,
  //     Arn: process.env.NOTIFICATION_TARGET_ARN!,
  //     Input: JSON.stringify(params),
  //   };

  //   const schedulerInput: AWS.Scheduler.CreateScheduleInput = {
  //     Name: params.name,
  //     FlexibleTimeWindow: {
  //       Mode: "OFF",
  //     },
  //     Target: target,
  //     ScheduleExpression: `at(${params.notificationTime})`,
  //     GroupName: process.env.NOTIFICATION_SCHEDULER_GROUP_NAME!,
  //     ClientToken: randomUUID(),
  //   };

  //   const result = await this.scheduler
  //     .createSchedule(schedulerInput)
  //     .promise();

  //   return result.$response.httpResponse;
  // }

  // private async stopExecution(
  //   Name: string,
  //   GroupName: string,
  //   ClientToken: string
  // ) {
  //   const ebScheduler = new AWS.Scheduler({
  //     region: process.env.AWS_SCHEDULER_REGION,
  //   });
  //   return ebScheduler
  //     .deleteSchedule({ Name, GroupName, ClientToken })
  //     .promise();
  // }

  // private getRegionFromArn(arn: string) {
  //   try {
  //     return arn.split(":")[3];
  //   } catch (e) {
  //     console.log("Could not get region from ARN. ", e);
  //   }
  // }
}

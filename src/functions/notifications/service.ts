import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import NotificationModel, {
  INotifExtraData,
  INotification,
  NotificationType,
} from "@models/Notification";
import { CustomError } from "@helpers/custom-error";
import { WebSocketService } from "@functions/websocket/service";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  validateGetNotifications,
  validateUpdateNotificationsReadStatus,
} from "./schema";
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
  ) {}

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
  async createNotification(body: {
    title: string;
    notificationType: NotificationType;
    isScheduled: boolean;
    extraData: INotifExtraData;
    senderEmployee: string;
    receiverEmployee: string;
    subtitle: string;
  }) {
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
    const notifItem = await NotificationModel.query().insert(
      notificationPayload
    );
    await this.webSocketService.sendPayloadByEmployeeId(
      receiverEmployee,
      notifItem
    );
    return notifItem;
  }

  /** @deprecated */
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
      .orderBy(...getOrderByItems({ ...body, sortBy: "createdAt" }))
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
    await validateUpdateNotificationsReadStatus(payload);

    const response = await NotificationModel.query()
      .patch({
        readStatus: payload.readStatus,
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
}

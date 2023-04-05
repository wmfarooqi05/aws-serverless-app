import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { ModuleType, NOTIFICATIONS_TABLE_NAME } from "./commons";

export type INFO_TYPE = "CREATE_COMPANY" | "UPDATE_COMPANY" | "DELETE_COMPANY";

interface IExtraData {
  // infoType: INFO_TYPE;
  infoType: string; // @TODO it is same as title for now
  senderEmployeeName: string;
  avatar: string;
  tableRowId: string;
  tableName: string;
  reminderId: string;
  reminderTime?: string;
}

export type NotificationType =
  | "ACTIONABLE_ITEM"
  | "INFO_NOTIFICATION"
  | "REMINDER_ALERT_NOTIFICATION";

export interface INotification {
  id?: string;
  title: string;
  subtitle: string;
  senderEmployee: string;
  receiverEmployee: string;
  extraData: IExtraData;
  notificationType: NotificationType;
  readStatus: boolean;
  isScheduled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@singleton()
export default class NotificationModel extends Model {
  static get tableName() {
    return NOTIFICATIONS_TABLE_NAME;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        subtitle: { type: "string" },
        senderEmployee: { type: "string" },
        // comma separated items
        receiverEmployee: { type: "string" },
        extraData: { type: "object" }, // object
        notificationType: { type: "string" },
        readStatus: { type: "boolean" },
        isScheduled: { type: "boolean" }, // if yes, extraData will have scheduling info
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "title",
        "senderEmployee",
        "receiverEmployee",
        "receiverEmployee",
      ],
      additionalProperties: false,
    };
  }
}

export type INotificationModel = ModelObject<NotificationModel>;

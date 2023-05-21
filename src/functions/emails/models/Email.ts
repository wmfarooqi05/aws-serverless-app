import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_METRICS_TABLE,
  EMAIL_RECIPIENT_TABLE,
  EMAIL_TABLE,
} from "./common";
import { RecipientModel } from "./Recipient";

// we can add things like
export type EMAIL_SENDER_TYPE = "COMPANY" | "EMPLOYEE";
export type EMAIL_STATUS =
  | "PENDING"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "DEFERRED"
  | "DRAFT"
  | "BOUNCED"
  | "BLOCKED"
  | "OPT_OUT"
  | "RECEIVED";
export const emailStatuses: EMAIL_STATUS[] = [
  "PENDING",
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "DEFERRED",
  "DRAFT",
  "BOUNCED",
  "BLOCKED",
  "OPT_OUT",
  "RECEIVED",
];

export interface IATTACHMENT {
  thumbnailUrl?: string;
  fileUrl: string;
  updatedAt: string;
  fileKey: string;
  filename: string;
}

export type EMAIL_DIRECTION = "SENT" | "RECEIVED";
export interface IEmail {
  id: string;
  subject: string;
  body: string;
  isBodyUploaded: boolean;
  direction: EMAIL_DIRECTION;
  sentAt: string;
  status: EMAIL_STATUS;
  attachments: IATTACHMENT[];
  sesMessageId: string;
}

@singleton()
export class EmailModel extends Model {
  static get tableName() {
    return "emails";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["subject", "body"],

      properties: {
        id: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        senderId: { type: "string" },
        direction: { type: "string" },
        sentAt: { type: "string" },
        sesMessageId: { type: "string" },
        attachments: {
          type: "array",
          default: [],
        },
        status: {
          type: "string",
          default: "PENDING",
          enum: emailStatuses,
        },
      },
    };
  }

  static get jsonAttributes() {
    return ["attachments"];
  }
  static get relationMappings() {
    return {
      recipients: {
        relation: Model.HasManyRelation,
        modelClass: RecipientModel,
        join: {
          from: `${EmailModel.tableName}.id`,
          to: `${RecipientModel.tableName}.emailId`,
        },
      },
      metrics: {
        relation: Model.HasManyRelation,
        modelClass: EMAIL_METRICS_TABLE,
        join: {
          from: `${EMAIL_TABLE}.id`,
          to: `${EMAIL_METRICS_TABLE}.emailId`,
        },
      },
    };
  }
}

export type IEmailModel = ModelObject<EmailModel>;
export type IEmailPaginated = IWithPagination<IEmailModel>;

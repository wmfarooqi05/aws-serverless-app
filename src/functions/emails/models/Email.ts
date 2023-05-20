import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_METRICS_TABLE,
  EMAIL_RECIPIENT_TABLE,
  EMAIL_TABLE,
  EMAIL_TO_EMAIL_RECIPIENT_TABLE,
} from "./common";
import { RecipientModel } from "./Recipent";

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
}

export type EMAIL_DIRECTION = "SENT" | "RECEIVED";
export interface IEmail {
  id: string;
  subject: string;
  body: string;
  isBodyUploaded:boolean;
  senderEmail: string;
  senderName: string;
  direction: EMAIL_DIRECTION;
  sentAt: string;
  status: EMAIL_STATUS;
  attachments: IATTACHMENT[];
  companyId: string;
  contactId: string;
}

@singleton()
export class EmailModel extends Model {
  static get tableName() {
    return "emails";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["subject", "body", "senderEmail"],

      properties: {
        id: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        senderEmail: { type: "string" },
        senderName: { type: "string" },
        direction: { type: "string" },
        companyId: { type: "string" },
        contactId: { type: "string" },
        sentAt: { type: "string" },
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
        relation: Model.ManyToManyRelation,
        modelClass: RecipientModel,
        join: {
          from: `${EMAIL_TABLE}.id`,
          through: {
            from: `${EMAIL_TO_EMAIL_RECIPIENT_TABLE}.email_id`,
            to: `${EMAIL_TO_EMAIL_RECIPIENT_TABLE}.recipient_id`,
            onDelete: "NO ACTION",
          },
          to: `${EMAIL_RECIPIENT_TABLE}.id`,
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

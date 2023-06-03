import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMAIL_METRICS_TABLE, EMAIL_RECORDS_TABLE } from "./commons";
import { IRecipient, RecipientModel } from "./Recipient";

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
  | "FAILED"
  | "RECEIVED_AND_PROCESSING"
  | "RECEIVED_AND_PROCESSED";
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
  "FAILED",
  "RECEIVED_AND_PROCESSING",
  "RECEIVED_AND_PROCESSED",
];

export interface IATTACHMENT {
  fileUrl: string;
  fileKey: string;
  originalName: string;
  s3FileName: string;
  cid?: string;
  thumbnailUrl?: string;
  updatedAt: string;
}

export type EMAIL_DIRECTION = "SENT" | "RECEIVED";
export interface IEmailRecord {
  id: string;
  subject: string;
  body: string;
  senderEmail: string;
  senderName: string;
  senderId: string;
  sentAt: string;
  emailSenderType: string;
  status: EMAIL_STATUS;
  attachments: IATTACHMENT[];
  isBodyUploaded: boolean;
  direction: EMAIL_DIRECTION;
  messageId: string;
  emailType: "SIMPLE_EMAIL" | "BULK";
  details: any;
  result: any;
  inReplyTo: string;
  references: string;
  priority: string;
  contentUrl: string;
  containsHtml: boolean;
}

export interface IEmailRecordWithRecipients extends IEmailRecord {
  recipients: IRecipient[];
}

@singleton()
export class EmailRecordModel extends Model {
  static get tableName() {
    return EMAIL_RECORDS_TABLE;
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
        messageId: { type: "string" },
        attachments: {
          type: "array",
          default: [],
        },
        emailType: { type: "string" },
        result: { type: "string" },
        status: {
          type: "string",
          default: "PENDING",
          enum: emailStatuses,
        },
        inReplyTo: { type: ["string", "null"], default: null },
        references: { type: ["string", "null"], default: null },
        contentUrl: { type: "string" },
        containsHtml: { type: "boolean" },
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
          from: `${EmailRecordModel.tableName}.id`,
          to: `${RecipientModel.tableName}.emailId`,
        },
      },
      metrics: {
        relation: Model.HasManyRelation,
        modelClass: EMAIL_METRICS_TABLE,
        join: {
          from: `${EMAIL_RECORDS_TABLE}.id`,
          to: `${EMAIL_METRICS_TABLE}.emailId`,
        },
      },
    };
  }
}

export type IEmailRecordModel = ModelObject<EmailRecordModel>;
export type IEmailRecordPaginated = IWithPagination<IEmailRecordModel>;

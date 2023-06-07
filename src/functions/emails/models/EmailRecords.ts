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
  /**
   * details:
   * in case of inbox, category for funnel
   */
  details: any;
  result: any;
  inReplyTo: string;
  references: string;
  priority: string;
  contentUrl: string;
  containsHtml: boolean;
  threadId: string;
  isRead: boolean;
  labels: string;
  emailFolder: string;
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
      required: ["subject", "body", "emailFolder"],

      properties: {
        id: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        direction: { type: "string" },
        sentAt: { type: ["string", "null"], default: null },
        messageId: { type: "string" },
        attachments: {
          type: "array",
          default: [],
        },
        emailType: { type: "string" },
        result: { type: ["string", "null"], default: null },
        status: {
          type: "string",
          default: "PENDING",
          enum: emailStatuses,
        },
        inReplyTo: { type: ["string", "null"], default: null },
        references: { type: ["string", "null"], default: null },
        contentUrl: { type: ["string", "null"], default: null },
        containsHtml: { type: "boolean" },
        threadId: { type: ["string", "null"], default: null },
        isRead: { type: "boolean" },
        labels: { type: ["string", "null"], default: null },
        emailFolder: { type: "string", default: "INBOX" },
        details: { type: "string", default: {} },
      },
    };
  }

  static get jsonAttributes() {
    return ["attachments", "details"];
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

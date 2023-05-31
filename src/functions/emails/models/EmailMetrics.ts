import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_METRICS_RECIPIENTS_TABLE,
  EMAIL_METRICS_TABLE,
  EMAIL_RECORDS_TABLE,
} from "./commons";
import {
  EmailMetricsRecipientModel,
  IEmailMetricsRecipients,
} from "./EmailMetricsRecipients";

export type MetricsEventType =
  | "RenderingFailure"
  | "Reject"
  | "Delivery"
  | "Bounce"
  | "Complaint"
  | "DeliveryDelay"
  | "Subscription"
  | "Open"
  | "Click";

export interface IEmailMetrics {
  id?: string;
  emailRecordId: string;
  senderEmail: string;
  eventType: string;
  timestamp: string;
  details?: any;
  recipients?: IEmailMetricsRecipients[];
  createdAt?: string;
  updatedAt?: string;
}

@singleton()
export class EmailMetricsModel extends Model {
  static get tableName() {
    return EMAIL_METRICS_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",

      properties: {
        id: { type: "string" },
        emailRecordId: { type: ["string", "null"] },
        senderEmail: { type: "string" },
        eventType: { type: "string" },
        details: { type: "object" },
        recipients: { type: "string" },
        timestamp: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  static get relationMappings() {
    return {
      email: {
        relation: Model.BelongsToOneRelation,
        modelClass: EMAIL_RECORDS_TABLE,
        join: {
          from: `${EMAIL_METRICS_TABLE}.emailRecordId`,
          to: `${EMAIL_RECORDS_TABLE}.id`,
        },
      },
      recipients: {
        relation: Model.HasManyRelation,
        modelClass: EmailMetricsRecipientModel,
        join: {
          from: `${EMAIL_METRICS_TABLE}.id`,
          to: `${EMAIL_METRICS_RECIPIENTS_TABLE}.metricsId`,
        },
      },
    };
  }
}

export type IEmailMetricsModel = ModelObject<EmailMetricsModel>;
export type IEmailMetricsPaginated = IWithPagination<IEmailMetricsModel>;

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_METRICS_RECIPIENTS_TABLE,
  EMAIL_METRICS_TABLE,
  EMAIL_TABLE,
} from "./commons";
import {
  EmailRecipientModel,
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
  emailId: string;
  eventType: string;
  details?: any;
  timestamp: string;
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
        emailId: { type: "string" },
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
        modelClass: EMAIL_TABLE,
        join: {
          from: `${EMAIL_METRICS_TABLE}.emailId`,
          to: `${EMAIL_TABLE}.id`,
        },
      },
      recipients: {
        relation: Model.HasManyRelation,
        modelClass: EmailRecipientModel,
        join: {
          from: `${EMAIL_METRICS_TABLE}.id`,
          to: `${EMAIL_METRICS_RECIPIENTS_TABLE}.emailId`,
        },
      },
    };
  }
}

export type IEmailMetricsModel = ModelObject<EmailMetricsModel>;
export type IEmailMetricsPaginated = IWithPagination<IEmailMetricsModel>;

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_METRICS_RECIPIENTS_TABLE,
  EMAIL_METRICS_TABLE,
  EMAIL_RECIPIENT_TABLE,
} from "./commons";
import { EmailMetricsModel, MetricsEventType } from "./EmailMetrics";

export interface IEmailMetricsRecipients {
  id?: string;
  emailId?: string;
  metricsId: string;
  eventType: MetricsEventType;
  recipientEmail: string;
}

@singleton()
export class EmailMetricsRecipientModel extends Model {
  static get tableName() {
    return EMAIL_METRICS_RECIPIENTS_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["recipientEmail", "eventType"],

      properties: {
        id: { type: "string" },
        metricsId: { type: "string" },
        emailId: { type: ["string", "null"] },
        eventType: { type: "string" },
        recipientEmail: { type: "string" },
      },
    };
  }

  static get relationMappings() {
    return {
      metrics: {
        relation: Model.HasOneRelation,
        modelClass: EmailMetricsModel,
        join: {
          from: `${EMAIL_METRICS_RECIPIENTS_TABLE}.metricsId`,
          to: `${EMAIL_METRICS_TABLE}.id`,
        },
      },
    };
  }
}

export type IEmailMetricsRecipientsModel = ModelObject<EmailMetricsRecipientModel>;
export type IEmailMetricsRecipientsPaginated =
  IWithPagination<IEmailMetricsRecipientsModel>;

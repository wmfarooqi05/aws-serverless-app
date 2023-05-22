import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMAIL_METRICS_TABLE, EMAIL_TABLE } from "./commons";

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
        eventType: { type: "string", maxLength: 255 },
        eventValue: { type: "object" },
        timestamp: { type: "string", format: "date-time" },
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
    };
  }
}

export type IEmailMetricsModel = ModelObject<EmailMetricsModel>;
export type IEmailMetricsPaginated = IWithPagination<IEmailMetricsModel>;

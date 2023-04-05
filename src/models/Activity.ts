import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMPLOYEES_TABLE_NAME,
  COMPANIES_TABLE_NAME,
  ACTIVITIES_TABLE,
} from "./commons";
import { IWithPagination } from "knex-paginate";
import {
  ACTIVITY_STATUS,
  ACTIVITY_TYPE,
  ACTIVITY_STATUS_SHORT,
  ACTIVITY_PRIORITY,
} from "./interfaces/Activity";

@singleton()
export default class ActivityModel extends Model {
  static get tableName() {
    return ACTIVITIES_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        summary: { type: "string" },
        details: { type: "object" },
        companyId: { type: "string" },
        createdBy: { type: "string" },
        dueDate: { type: "string" },
        remarks: { type: "array", default: [] },
        concernedPersonDetails: { type: "array", default: JSON.stringify([]) },
        activityType: { type: "string", default: ACTIVITY_TYPE.EMAIL },
        priority: { type: "string", default: ACTIVITY_PRIORITY.NORMAL },
        status: { type: "string", default: ACTIVITY_STATUS.NOT_STARTED }, // will turn false after scheduled work is done
        statusShort: { type: "string", default: ACTIVITY_STATUS_SHORT.OPEN },
        statusHistory: { type: "array", default: JSON.stringify([]) },
        tags: { type: "array", default: JSON.stringify([]) }, // Move to table taggedActivities
        reminders: { type: "object", default: JSON.stringify({}) }, // @TODO move to reminders table
        scheduled: { type: "boolean" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["companyId", "createdBy", "details"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    activityToCompany: {
      relation: Model.BelongsToOneRelation,
      modelClass: COMPANIES_TABLE_NAME,
      join: {
        from: `${ACTIVITIES_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
    activityToEmployee: {
      relation: Model.BelongsToOneRelation,
      modelClass: EMPLOYEES_TABLE_NAME,
      join: {
        from: `${ACTIVITIES_TABLE}.createdBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return [
      "details",
      "callDetails",
      "emailDetails",
      "remarks",
      "concernedPersonDetails",
      "reminders",
      "statusHistory",
      "tags",
    ];
  }
  $beforeInsert() {}

  async $beforeUpdate(opt, queryContext) {
    console.log("afterupdate");
    await super.$afterUpdate(opt, queryContext);

    const payload = this.toJSON();
    this.statusShort = this.getStatusShort(payload.status);

    if (payload.details?.isScheduled) {
      this.statusShort = ACTIVITY_STATUS_SHORT.SCHEDULED;
    }
  }

  getStatusShort(status: ACTIVITY_STATUS): ACTIVITY_STATUS_SHORT {
    switch (status) {
      case ACTIVITY_STATUS.COMPLETED:
        return ACTIVITY_STATUS_SHORT.CLOSED;
      case ACTIVITY_STATUS.DEFERRED:
        return ACTIVITY_STATUS_SHORT.CLOSED;
      case ACTIVITY_STATUS.IN_PROGRESS:
        return ACTIVITY_STATUS_SHORT.OPEN;
      case ACTIVITY_STATUS.NEED_APPROVAL:
        return ACTIVITY_STATUS_SHORT.OPEN;
      case ACTIVITY_STATUS.NOT_STARTED:
        return ACTIVITY_STATUS_SHORT.OPEN;
      case ACTIVITY_STATUS.WAITING_FOR_SOMEONE_ELSE:
        return ACTIVITY_STATUS_SHORT.OPEN;
      default:
        return ACTIVITY_STATUS_SHORT.OPEN;
    }
  }
}

export type IActivityModel = ModelObject<ActivityModel>;
export type IActivityPaginated = IWithPagination<IActivityModel>;

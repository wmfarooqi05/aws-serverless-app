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
        title: { type: "string" },
        summary: { type: "string" },
        details: { type: "object" },
        companyId: { type: "string" },
        createdBy: { type: "string" },
        dueDate: { type: "string" },
        remarks: { type: "array", default: [] },
        contactDetails: { type: "array", default: JSON.stringify([]) },
        // contactId: { type: "string" },
        activityType: { type: "string", default: ACTIVITY_TYPE.TASK },
        priority: { type: "string", default: ACTIVITY_PRIORITY.NORMAL },
        status: { type: "string", default: ACTIVITY_STATUS.NOT_STARTED }, // will turn false after scheduled work is done
        statusShort: { type: "string", default: ACTIVITY_STATUS_SHORT.OPEN },
        tags: { type: "array", default: JSON.stringify([]) }, // Move to table taggedActivities
        reminders: { type: "object", default: JSON.stringify({}) }, // @TODO move to reminders table
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
      "contactDetails",
      "reminders",
      "tags",
    ];
  }

  async $beforeInsert() {}

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);

    const payload = this.toJSON();
    this.statusShort = ActivityModel.getStatusShort(payload.status);

    if (payload.details?.isScheduled) {
      this.statusShort = ACTIVITY_STATUS_SHORT.SCHEDULED;
    }
  }

  static getStatusShort(status: ACTIVITY_STATUS): ACTIVITY_STATUS_SHORT {
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
      case ACTIVITY_STATUS.SCHEDULED:
        return ACTIVITY_STATUS_SHORT.SCHEDULED;
      default:
        return ACTIVITY_STATUS_SHORT.OPEN;
    }
  }
}

export type IActivityModel = ModelObject<ActivityModel>;
export type IActivityPaginated = IWithPagination<IActivityModel>;

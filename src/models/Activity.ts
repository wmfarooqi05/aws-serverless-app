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
  ACTIVITY_STATUS_DETAILED,
  ACTIVITY_STATUS_SHORT,
  ACTIVITY_PRIORITY,
} from "./interfaces/Activity";

@singleton()
export default class ActivityModel extends Model {
  static get tableName() {
    return ACTIVITIES_TABLE;
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
        remarks: {
          type: "array",
          default: JSON.stringify([]),
        },
        concernedPersonDetails: {
          type: "array",
          default: JSON.stringify([]),
        },
        activityType: {
          type: "string",
          default: ACTIVITY_TYPE.EMAIL,
        },
        priority: { type: "string", default: ACTIVITY_PRIORITY.NORMAL },
        status: { type: "string", default: ACTIVITY_STATUS.NOT_STARTED }, // will turn false after scheduled work is done
        statusShort: {
          type: "string",
          default: ACTIVITY_STATUS_SHORT.OPEN,
        },
        tags: { type: "array", default: JSON.stringify([]) }, // Move to table taggedActivities
        reminders: { type: "array", default: JSON.stringify([]) }, // @TODO move to reminders table
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
    ];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type IActivityModel = ModelObject<ActivityModel>;
export type IActivityPaginated = IWithPagination<IActivityModel>;

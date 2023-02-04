import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { IWithPagination } from "knex-paginate";
import Activity, { ACTIVITIES_TABLE } from "./Activity";

export const REMINDER_TABLE = process.env.REMINDER_TABLE || "reminder_local";

enum ReminderStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  SENT = "SENT",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

enum ReminderTimeType {
  Reminder_5M_Before = "Reminder_5M_Before",
  Reminder_15M_Before = "Reminder_15M_Before",
  Reminder_1H_Before = "Reminder_1H_Before",
  Reminder_24H_Before = "Reminder_24H_Before",
}

enum ReminderType {
  GENERAL = "GENERAL",
  EMAIL = "EMAIL",
  PHONE_CALL = "PHONE_CALL",
  MEETING = "MEETING",
  TASK = "TASK",
}

@singleton()
export default class Reminder extends Model {
  static get tableName() {
    return REMINDER_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        executionArn: { type: "string" },
        object_id: { type: "string" },
        reminder_time_type: {
          type: "string",
          default: ReminderTimeType.Reminder_24H_Before,
        },
        type: { type: "string", default: ReminderType.GENERAL },
        status: { type: "string", default: ReminderStatus.PENDING },
        reminder_time: { type: "string" },
        data: { type: "object", default: {} },
        activityId: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["object_id", "reminder_type"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    reminderToActivity: {
      relation: Model.BelongsToOneRelation,
      modelClass: Activity,
      join: {
        from: `${REMINDER_TABLE}.activityId`,
        to: `${ACTIVITIES_TABLE}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["data"];
  }
}

export type IReminder = ModelObject<Reminder>;
export type IReminderPaginated = IWithPagination<IReminder>;

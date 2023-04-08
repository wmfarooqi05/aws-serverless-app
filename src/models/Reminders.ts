import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { IWithPagination } from "knex-paginate";
import Activity from "./Activity";
import { ACTIVITIES_TABLE } from "./commons";

export const REMINDERS_TABLE = process.env.REMINDERS_TABLE || "reminders";

export enum ReminderStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
  ERROR_CLEANUP = "ERROR_CLEANUP",
  SENT = "SENT",
  DONE = "DONE",
}

// export type ReminderType = "JOB" | "REMINDER"

export enum ReminderTimeType {
  CUSTOM = "CUSTOM",
  Reminder_5M_Before = "Reminder_5M_Before",
  Reminder_15M_Before = "Reminder_15M_Before",
  Reminder_1H_Before = "Reminder_1H_Before",
  Reminder_24H_Before = "Reminder_24H_Before",
}

export const ReminderTimeTypeMap: { [k: number]: ReminderTimeType } = {
  5: ReminderTimeType.Reminder_5M_Before,
  15: ReminderTimeType.Reminder_15M_Before,
  60: ReminderTimeType.Reminder_1H_Before,
  3600: ReminderTimeType.Reminder_24H_Before,
};

export enum ReminderType {
  GENERAL = "GENERAL",
  EMAIL = "EMAIL",
  PHONE_CALL = "PHONE_CALL",
  MEETING = "MEETING",
  TASK = "TASK",
}

export type SCHEDULED_STATUS = "SCHEDULED" | "ERROR";

export interface IReminder {
  id: string;
  executionArn: string;
  reminderName: string;
  reminderGroupName: string;
  reminderTimeType: string;
  method: string;
  status: SCHEDULED_STATUS;
  reminderTime: string;
  minutesDiff: number;
  data: {
    jobData?: JSON;
  };
  tableRowId: string;
  tableName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  schedulerExpression: string;
}

@singleton()
export default class ReminderModel extends Model {
  static get tableName() {
    return REMINDERS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        executionArn: { type: "string" },
        reminderName: { type: "string" },
        reminderGroupName: { type: "string" },
        reminderTimeType: {
          type: "string",
          default: ReminderTimeType.Reminder_24H_Before,
        },
        method: { type: "string" },
        type: { type: "string", default: ReminderType.GENERAL },
        statusCode: { type: "integer" },
        status: { type: "string", default: ReminderStatus.PENDING },
        reminderTime: { type: "string" },
        minutesDiff: { type: "integer" },
        schedulerExpression: { type: "string" },
        data: { type: "object", default: {} },
        tableRowId: { type: "string" },
        tableName: { type: "string" },
        createdBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["type", "reminderTime"],
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
        from: `${REMINDERS_TABLE}.activityId`,
        to: `${ACTIVITIES_TABLE}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["data"];
  }
}

export type IReminderModel = ModelObject<ReminderModel>;
export type IReminderPaginated = IWithPagination<IReminderModel>;

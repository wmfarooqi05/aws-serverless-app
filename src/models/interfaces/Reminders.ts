import { ReminderTimeType } from "@models/Reminders";

export type EBSchedulerEventType = "REMINDER" | "JOB";

export interface IEBSchedulerEventInput {
  schedulerExpression: string;
  name: string;
  idClientToken: string;
  eventType: EBSchedulerEventType;
  data: {
    tableName: string;
    tableRowId: string;
    method: "popup" | "email";
    minutes: number;
  };
}

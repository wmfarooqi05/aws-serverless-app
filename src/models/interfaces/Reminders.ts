import { ReminderTimeType } from "@models/Reminders";

export type SQSEventType = "REMINDER" | "JOB" | "SEND_EMAIL";

export interface I_SQS_EVENT_INPUT {
  jobId?: string;
  eventType: SQSEventType;
}

export interface IEBSchedulerEventInput extends I_SQS_EVENT_INPUT {
  schedulerExpression: string;
  name: string;
  idClientToken: string;
  details: {
    tableName: string;
    tableRowId: string;
    method: "popup" | "email";
    minutes: number;
  };
}

export interface IEmailSqsEventInput extends I_SQS_EVENT_INPUT {}

export interface IJobSqsEventInput extends I_SQS_EVENT_INPUT {
  jobId: string;
}

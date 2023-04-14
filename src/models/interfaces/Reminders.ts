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

export interface IEmailSqsEventInput extends I_SQS_EVENT_INPUT {
  name: string;
  details: [{
    senderId: string;
    senderEmail: string;
    //    replyHeader: string;
    ConfigurationSetName?: string;
    replyTo?: string[];
    recipientId?: string;
    recipientEmail: string;
    subject: string;
    body: string;
    ccList?: string[];
    bccList?: string[];
    companyId?: string;
  }];
}

export interface IJobSqsEventInput extends I_SQS_EVENT_INPUT {
  jobId: string;
}

import { ReminderTimeType } from "@models/Reminders";

export type SQSEventType = "REMINDER" | "JOB" | "SEND_EMAIL" | "BULK_SIGNUP";

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
  name?: string;
  details: {
    senderId: string;
    senderEmail: string;
    //    replyHeader: string;
    ConfigurationSetName?: string;
    replyTo?: string[];
    recipients: {
      recipientId?: string;
      recipientEmail: string;
      companyId?: string;
      recipientName: string;
    }[];
    subject: string;
    body: string;
    ccList?: string[];
    bccList?: string[];
  };
  /**
   * SQS Message Id
   */
  messageId: string;
  /**
   * Job Table Id
   */
  jobId: string;
}

export interface IJobSqsEventInput extends I_SQS_EVENT_INPUT {
  jobId: string;
}

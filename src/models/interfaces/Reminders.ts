import { ReminderTimeType } from "@models/Reminders";

export type SQSEventType = "REMINDER" | "JOB" | "SEND_EMAIL" | "BULK_SIGNUP" | "BULK_SIGNUP_PREPARE";

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

export interface IRecipientItem {
  recipientName: string;
  recipientEmail: string;
}

export interface IEmailSqsEventInput extends I_SQS_EVENT_INPUT {
  name?: string;
  details: {
    senderId: string;
    senderEmail: string;
    //    replyHeader: string;
    ConfigurationSetName?: string;
    replyTo?: string[];
    toList: IRecipientItem[];
    subject: string;
    body: string;
    ccList?: IRecipientItem[];
    bccList?: IRecipientItem[];
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

export type SQSEventType =
  | "BULK_SIGNUP"
  // | "BULK_SIGNUP_PREPARE"
  | "BULK_EMAIL_PREPARE"
  | "BULK_EMAIL"
  | "PROCESS_TEMPLATE"
  | "DELETE_S3_FILES"
  | "ADD_GOOGLE_MEETING"
  | "DELETE_GOOGLE_MEETING"
  | "CREATE_EB_SCHEDULER"
  | "DELETE_EB_SCHEDULER"
  | "CREATE_MEDIA_FILE_VARIATIONS";

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

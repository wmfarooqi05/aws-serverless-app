import { EmailAddress } from "mailparser";

export interface IEmailAddress {
  name?: string;
  email: string;
}

export interface MessageTag {
  name: string;
  value: string;
}

export interface EmailTemplatePlaceholder {
  key: string;
  value: string;
}

export interface I_BULK_EMAIL_JOB_PREPARE {
  senderEmail: string;
  senderName: string;
  replyToAddresses: string[];
  emailListId: string;
  templateName: string;
  defaultPlaceholders: EmailTemplatePlaceholder[];
  defaultTags: MessageTag[];
  configurationSetName: string;
  ccList: IEmailAddress[];
}

export interface EMAIL_TEMPLATE_DATA {
  /**
   * It will be either email or name<email> string
   */
  destination: string;
  /**
   * This will be a json string
   */
  placeholders: string;
}

export interface I_BULK_EMAIL_JOB extends I_BULK_EMAIL_JOB_PREPARE {
  templateData: EMAIL_TEMPLATE_DATA[];
  emailTemplateS3Url: string;
  subject: string;  
}

// export interface I_BULK_EMAIL_JOB {
//   destinations: I_BULK_EMAIL_JOB_DETAILS[];
// }

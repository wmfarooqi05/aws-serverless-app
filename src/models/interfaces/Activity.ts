import { IConcernedPerson } from "./Company";
import { IEmployee } from "../Employees";

export enum ACTIVITY_TYPE {
  TASK = "TASK",
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
}

export enum ACTIVITY_STATUS_SHORT {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  SCHEDULED = "SCHEDULED",
}

export enum ACTIVITY_STATUS {
  // OPEN
  DRAFT = "DRAFT", // if task is closed without saving
  // Approval by manager, like for meetings, or some serious emails or calls
  NEED_APPROVAL = "NEED_APPROVAL",
  BACKLOG = "BACKLOG", // DEFAULT STATUS
  TODO = "TODO", // Employee marks it, that now he is going to working on it soon
  IN_PROGRESS = "IN_PROGRESS",

  // SCHEDULED
  SCHEDULED = "SCHEDULED",

  // COMPLETED
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}

// rename this to Activity
// link this with task, not company

export interface IReminder {
  id: string;
  title: string;
  repeat: string;
  // add whole reminder logic here
}

export interface IActivity {
  id?: string;
  summary: string;
  details: IACTIVITY_DETAILS;
  companyId: string;
  createdBy: string;
  remarks: IRemarks[];
  concernedPersonDetails: Pick<IConcernedPerson, "id" | "name">;
  activityType: ACTIVITY_TYPE;
  status: ACTIVITY_STATUS; // @TODO replace with status
  tags: string[];
  createdAt: string;
  updatedAt: string;
  reminders?: IReminder[];
}

export interface IRemarks {
  id: string;
  activityId: string;
  remarksText: string;
  employeeDetails: Pick<IEmployee, "name" | "email" | "id">;
  reportingManager?: Pick<IEmployee, "name" | "email" | "id">;
  createdAt: string;
  updatedAt: string;
}

export enum CALL_TYPE {
  OUTGOING = "OUTGOING",
  INCOMING = "INCOMING",
  MISSED = "MISSED",
}

export interface IPHONE_DETAILS {
  callType: CALL_TYPE;
  callDuration: number;
  phoneNumber: string;
  date: string;
  callAgenda: string;
  callResult: string;
  description: string;
  callStartTime: string;
  callEndTime: string;
  isScheduled: boolean;
}
export interface IEMAIL_DETAILS {
  fromEmail: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  body: string;
  status?: string;
  isScheduled: boolean;
  // attachment: string;
}

export interface IMEETING_DETAILS {
  summary: string;
  calendarId: string;
  attendees: { email: string; displayName: string }[];
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  sendUpdates: "all" | "externalOnly" | "none";
  createVideoLink: boolean;
  reminders?: {
    useDefault?: boolean;
    overrides?: [{
      /**
       * The method used by this reminder. Possible values are:
       * - "email" - Reminders are sent via email.
       * - "popup" - Reminders are sent via a UI popup.
       * Required when adding a reminder.
       */
      method: "email" | "popup";
      /**
       * Number of minutes before the start of the event when the reminder should trigger. Valid values are between 0 and 40320 (4 weeks in minutes).
       * Required when adding a reminder.
       */
      minutes: number;
    }];
  };
}

export interface ITASK_DETAILS {
  dueDate: string;
  status: string;
  title: string;
  summary: string;
  description: string;
  isScheduled: boolean;
}

export type IACTIVITY_DETAILS =
  | IPHONE_DETAILS
  | IEMAIL_DETAILS
  | IMEETING_DETAILS
  | ITASK_DETAILS;

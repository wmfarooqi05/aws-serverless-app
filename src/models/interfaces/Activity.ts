import { IContact } from "./Company";
import { IEmployee } from "./Employees";

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
  NOT_STARTED = "NOT_STARTED",
  NEED_APPROVAL = "NEED_APPROVAL",
  WAITING_FOR_SOMEONE_ELSE = "WAITING_FOR_SOMEONE_ELSE",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  DEFERRED = "DEFERRED",
}

export const ACTIVITY_STATUSES = [
  "NOT_STARTED",
  "NEED_APPROVAL",
  "WAITING_FOR_SOMEONE_ELSE",
  "IN_PROGRESS",
  "COMPLETED",
  "DEFERRED",
];

export enum ACTIVITY_PRIORITY {
  NONE = "NONE",
  LOWEST = "LOWEST",
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  HIGHEST = "HIGHEST",
}

export interface IReminderInterface {
  useDefault?: boolean;
  overrides?: [
    {
      method: "email" | "popup";
      minutes: number;
    }
  ];
}

// rename this to Activity
// link this with task, not company

export interface IStatusHistory {
  id: string;
  status: string;
  updatedAt: string;
  updatedBy: string;
}

export interface IActivity {
  id?: string;
  summary: string;
  details: IACTIVITY_DETAILS;
  companyId: string;
  createdBy: string;
  remarks?: IRemarks[];
  contactDetails: IContact[];
  activityType: ACTIVITY_TYPE;
  priority: ACTIVITY_PRIORITY;

  status: ACTIVITY_STATUS; // @TODO replace with status
  statusShort: ACTIVITY_STATUS_SHORT;
  tags: string[];
  reminders?: IReminderInterface;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  jobData: JSON;
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

export interface IEMAIL_DETAILS {
  fromEmail: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  body: string;
  status?: string;
  isDraft: boolean;
  jobData?: Object;
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
  jobData?: Object;
  // @TODO verify and make this IReminderInterface
  reminders?: {
    useDefault?: boolean;
    overrides?: [
      {
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
      }
    ];
  };
}

export interface ITASK_DETAILS {
  status: string;
  title: string;
  summary: string;
  description: string;
  isScheduled: boolean;
  jobData?: Object;
}

export interface ICALL_DETAILS {
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
  jobData?: Object;
}

export type IACTIVITY_DETAILS =
  | ICALL_DETAILS
  | IEMAIL_DETAILS
  | IMEETING_DETAILS
  | ITASK_DETAILS;

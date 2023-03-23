import {
  ACTIVITY_TYPE,
  IACTIVITY_DETAILS,
  IEMAIL_DETAILS,
  IStatusHistory,
} from "@models/interfaces/Activity";
import { IEmployee } from "@models/interfaces/Employees";
import { randomUUID } from "crypto";
import { calendar_v3 } from "googleapis";
import moment from "moment";

export const createDetailsPayload = (
  employee: IEmployee,
  activityType: ACTIVITY_TYPE,
  details: IACTIVITY_DETAILS
) => {
  switch (activityType) {
    case ACTIVITY_TYPE.EMAIL:
      return createEmailPayload(employee, details);
    case ACTIVITY_TYPE.CALL:
      return createCallPayload(details);
    case ACTIVITY_TYPE.MEETING:
      return createMeetingPayload(details);
    case ACTIVITY_TYPE.TASK:
      return createTaskPayload(details);
  }
};

export const createEmailPayload = (
  employee: IEmployee,
  payload
): IEMAIL_DETAILS => {
  const { body, isDraft, subject, timezone, date } = payload;

  let toStr = "";
  payload.to.forEach((item) => {
    if (item.name) {
      toStr += `${item.name} <${item.email}>, `;
    } else {
      toStr += item.email;
    }
  });

  let _isDraft: boolean = isDraft ?? false;

  return {
    to: toStr,
    from: `${employee.name} <${employee.email}>`,
    body: body,
    date: moment.tz(date, timezone).utc().format(),
    messageId: randomUUID(),
    fromEmail: employee.email,
    isDraft: _isDraft,
    subject,
  };
};

export const createCallPayload = (payload) => {
  return payload ? payload : {};
};

export const createMeetingPayload = (payload) => {
  const {
    summary,
    attendees,
    description,
    location,
    createVideoLink,
    startDateTime,
    endDateTime,
    timezone,
    reminders,
    calendarId,
    sendUpdates,
  } = payload;

  const event: calendar_v3.Schema$Event = {
    summary: summary,
    attendees: attendees,
    description: description,
    location: createVideoLink ? "Online" : location,
    start: {
      dateTime: startDateTime,
      timeZone: timezone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: timezone,
    },
    reminders: reminders,
    id: randomUUID(),
  };

  event["createVideoLink"] = createVideoLink;
  event["calendarId"] = calendarId;
  event["sendUpdates"] = sendUpdates;
  return event;
};

export const createTaskPayload = (payload) => {
  return payload ? payload : {};
};

export const createStatusHistory = (
  status: string,
  employeeId: string
): IStatusHistory => {
  return {
    id: randomUUID(),
    status,
    updatedAt: moment().utc().format(),
    updatedBy: employeeId,
  };
};

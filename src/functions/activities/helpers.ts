import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";
import ActivityModel from "@models/Activity";
import {
  ACTIVITY_TYPE,
  IACTIVITY_DETAILS,
  IEMAIL_DETAILS,
  ICALL_DETAILS,
  IStatusHistory,
  ITASK_DETAILS,
  CALL_TYPE,
} from "@models/interfaces/Activity";
import { IEmployee } from "@models/interfaces/Employees";
import { randomUUID } from "crypto";
import { calendar_v3 } from "googleapis";
import { Knex } from "knex";
import moment from "moment-timezone";

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
  const { dueDate, status, title, summary, description, isScheduled } =
    payload as ITASK_DETAILS;

  return {
    dueDate,
    status,
    title,
    summary,
    description,
    isScheduled,
  };
};

export const createCallPayload = (payload) => {
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

export const sortedTags = (tags: string[]): string[] => {
  if (!(tags?.length > 0)) return [];
  return tags?.sort((a, b) => a.localeCompare(b));
};

export const addFiltersToQueryBuilder = (queryBuilder, body) => {
  const { status, dateFrom, dateTo, type, returningFields, tags } = body;

  queryBuilder.select(
    sanitizeColumnNames(ActivityModel.columnNames, returningFields)
  );

  if (status) {
    queryBuilder.whereIn("status", status?.split(","));
  }

  if (tags) {
    queryBuilder.where(
      "tags",
      "@>",
      JSON.stringify(tags?.split(",").map((x) => x.trim()))
    );
  }
  if (type) {
    queryBuilder.whereIn("activityType", type?.split(","));
  }
  if (dateFrom && dateTo) {
    queryBuilder.whereBetween("dueDate", [dateFrom, dateTo]);
  } else if (dateFrom) {
    queryBuilder.where("dueDate", ">=", dateFrom);
  } else if (dateTo) {
    queryBuilder.where("dueDate", "<=", dateTo);
  }

  queryBuilder.orderBy(...getOrderByItems(body));
  queryBuilder.paginate(getPaginateClauseObject(body));

  return queryBuilder;
};

export const addStaleActivityFilters = (
  qb: Knex.QueryBuilder<any, any>,
  body
): Knex.QueryBuilder<any, any> => {
  const { statuses, daysAgo, priorities, activityTypes } = body;
  const days = daysAgo ? parseInt(daysAgo) : 7;
  const daysAgoCount = moment()
    .subtract(days, "days")
    .startOf("day")
    .utc()
    .format();

  if (statuses) {
    qb.whereIn("status", statuses?.split(","));
  }
  if (priorities) {
    qb.whereIn("priority", priorities?.split(","));
  }
  if (activityTypes) {
    qb.whereIn("activity_type", activityTypes?.split(","));
  }
  qb.whereRaw(
    `(((status_history->>-1)::jsonb)->>'updatedAt')::timestamp < ?`,
    daysAgoCount
  );
  qb.orderByRaw(
    "(((status_history->> -1)::jsonb)->>'updatedAt')::timestamp DESC"
  );
  qb.paginate(getPaginateClauseObject(body));
  return qb;
};

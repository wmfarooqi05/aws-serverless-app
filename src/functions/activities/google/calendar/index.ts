//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const getAllCalendars = {
  handler: `${handlerPath(__dirname)}/handler.getAllCalendars`,
  events: [
    {
      http: {
        method: "get",
        path: "google/calendars",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

const getMeetings = {
  handler: `${handlerPath(__dirname)}/handler.getMeetings`,
  events: [
    {
      http: {
        method: "get",
        path: "google/calendar/{calendarId}/meeting",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

const getMeetingById = {
  handler: `${handlerPath(__dirname)}/handler.getMeetingById`,
  events: [
    {
      http: {
        method: "post",
        path: "google/calendar/{calendarId}/meeting/{meetingId}",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};
const createMeeting = {
  handler: `${handlerPath(__dirname)}/handler.createMeeting`,
  events: [
    {
      http: {
        method: "post",
        path: "google/calendar/{calendarId}/meeting",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

const updateMeetingById = {
  handler: `${handlerPath(__dirname)}/handler.updateMeetingById`,
  events: [
    {
      http: {
        method: "put",
        path: "google/calendar/{calendarId}/meeting/{meetingId}",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};
const deleteMeetingById = {
  handler: `${handlerPath(__dirname)}/handler.deleteMeetingById`,
  events: [
    {
      http: {
        method: "delete",
        path: "google/calendar/{calendarId}/meeting/{meetingId}",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

export {
  getAllCalendars,
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeetingById,
  deleteMeetingById,
};

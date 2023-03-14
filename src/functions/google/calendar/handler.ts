import "reflect-metadata";

import { INotificationModel } from "@models/Notification";

import {
  formatErrorResponse,
  formatGoogleErrorResponse,
  formatGoogleJSONResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { GoogleCalendarService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import jwtMiddlewareWrapper from "@libs/middlewares/jwtMiddleware";

// @TODO All the handler functions must be DEV only
// We will control them from Activity Service -> GoogleService

export const getMeetings = async (event) => {
  try {
    await container.resolve(GoogleCalendarService);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getMeetingById = async (event, _context) => {
  try {
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createMeetingHandler = async (event, _context) => {
  try {
    const { calendarId } = event.pathParameters;
    const meeting = await container
      .resolve(GoogleCalendarService)
      .createMeeting(event.employee?.sub, calendarId, event.body);
    return formatGoogleJSONResponse(meeting, 201);
  } catch (e) {
    console.log("error", e);
    return formatGoogleErrorResponse(e);
  }
};

export const updateMeetingById = async (event, _context) => {
  try {
    const { calendarId, meetingId } = event.pathParameters;
    // const meeting = await container
    //   .resolve(GoogleCalendarService)
    //   .updateMeeting(event.employee?.sub, calendarId, meetingId, event.body);

    // console.log("meeting success", meeting);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const deleteMeetingById = async (event, _context) => {
  try {
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getAllCalendarsHandler = async (event) => {
  try {
    const calendars = await container
      .resolve(GoogleCalendarService)
      .getAllCalendars(event.employee?.sub, event?.queryStringParameters?.nextSyncToken);
    return formatGoogleJSONResponse(calendars, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const createMeeting = jwtMiddlewareWrapper(createMeetingHandler);
export const getAllCalendars = jwtMiddlewareWrapper(getAllCalendarsHandler);

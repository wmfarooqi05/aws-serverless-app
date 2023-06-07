import "reflect-metadata";

import {
  formatErrorResponse,
  formatGoogleErrorResponse,
  formatGoogleJSONResponse,
} from "@libs/api-gateway";
import { GoogleGmailService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import jwtMiddlewareWrapper, {
  checkRolePermission,
} from "@middlewares/jwtMiddleware";

// @TODO All the handler functions must be DEV only
// We will control them from Activity Service -> GoogleService

export const createDraft = async () => {};

export const createAndSendEmailHandler = async (event) => {
  try {
    const response = await container
      .resolve(GoogleGmailService)
      .createAndSendEmail(event.employee?.sub, event.body);
    return formatGoogleJSONResponse(response, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getAllInbox = async () => {};

export const getSentItems = async () => {};

export const getMeetings = async (event) => {
  try {
    await container.resolve(GoogleGmailService);
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
    const { gmailId } = event.pathParameters;
    const meeting = await container
      .resolve(GoogleGmailService)
      .createMeeting(event.employee?.sub, gmailId, event.body);
    return formatGoogleJSONResponse(meeting, 201);
  } catch (e) {
    console.log("error", e);
    return formatGoogleErrorResponse(e);
  }
};

export const updateMeetingById = async (event, _context) => {
  try {
    const { gmailId, meetingId } = event.pathParameters;
    // const meeting = await container
    //   .resolve(GoogleGmailService)
    //   .updateMeeting(event.employee?.sub, gmailId, meetingId, event.body);

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

export const createMeeting = jwtMiddlewareWrapper(createMeetingHandler);
export const createAndSendEmail = jwtMiddlewareWrapper(
  createAndSendEmailHandler
);

export const scrapeGmailHandler = async (event) => {
  try {
    const result = await container
      .resolve(GoogleGmailService)
      .scrapeGmail(event.employee);
    return formatGoogleJSONResponse(result, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const scrapeGmail = checkRolePermission(
  scrapeGmailHandler,
  "COMPANY_READ_ALL"
);

import "reflect-metadata";

import { IReminderModel, IReminderPaginated } from "@models/Reminder";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { ReminderService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";

export const handleEBSchedulerLambdaInvoke = async (event) => {
  try {
    await container.resolve(ReminderService).handleEBSchedulerInvoke(event);
    return formatJSONResponse({}, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createReminderHandler: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    const newReminder = await container
      .resolve(ReminderService)
      .createReminder(event.employee, event.body);
    return formatJSONResponse(newReminder, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getRemindersHandler: ValidatedEventAPIGatewayProxyEvent<
  IReminderPaginated
> = async (event) => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .getAllReminders(event.queryStringParameters || {});
    return formatJSONResponse(reminders, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getReminderById: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  const { reminderId } = event.pathParameters;
  try {
    const reminders = await container
      .resolve(ReminderService)
      .getReminder(reminderId);
    return formatJSONResponse(reminders, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateReminder: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    console.log("event.pathParameters", event.pathParameters);
    console.log("event.body", event.body);
    const { reminderId } = event.pathParameters;
    const updatedReminder = await container
      .resolve(ReminderService)
      .updateReminder(reminderId, event.body);
    return formatJSONResponse(updatedReminder, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const deleteReminder: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    const { reminderId } = event.pathParameters;
    await container
      .resolve(ReminderService)
      .deleteScheduledReminder(reminderId);
    return formatJSONResponse(
      { message: "Reminder deleted successfully" },
      200
    );
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const dailyReminderCleanup = async () => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .dailyReminderCleanup();
    return formatJSONResponse({ reminders }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateScheduleReminder = async (event) => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .updateScheduleReminder(event.body);
    return formatJSONResponse({ reminders }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};
export const deleteScheduleReminder = async (event) => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .deleteScheduleReminder(event.body);
    return formatJSONResponse({ reminders }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getSchedulerGroups = async (event) => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .getScheduleRemindersFromGroup(event.queryStringParameters || {});
    return formatJSONResponse({ reminders }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getSchedulers = async (event) => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .getScheduleRemindersFromGroup(event.queryStringParameters || {});
    return formatJSONResponse({ reminders }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const deleteAllReminders = async (event) => {
  try {
    const reminders = await container
      .resolve(ReminderService)
      .deleteAllReminders(event.queryStringParameters || {});
    return formatJSONResponse({ reminders }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getReminders = middy(getRemindersHandler).use(
  decodeJWTMiddleware()
);

export const createReminder = checkRolePermission(
  createReminderHandler,
  "COMPANY_READ"
);

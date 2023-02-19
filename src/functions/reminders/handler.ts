import "reflect-metadata";

import { IReminderModel, IReminderPaginated } from "@models/Reminder";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { ReminderService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";

export const createReminder: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    const newReminder = await container
      .resolve(ReminderService)
      .ScheduleReminder(event.body);
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

const updateReminderAssignedUserHandler: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    // @TODO put auth guard
    // User must be there
    // Role guard of manager or above
    const { reminderId } = event.pathParameters;
    const reminder = await container
      .resolve(ReminderService)
      .updateReminderAssignedUser(reminderId, event?.user?.sub, event.body);

    return formatJSONResponse({ reminder }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createConcernedPersonsHandler: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    const { reminderId } = event.pathParameters;
    const reminder = await container
      .resolve(ReminderService)
      .createConcernedPersons(reminderId, event?.user?.sub, event.body);
    return formatJSONResponse({ reminder }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateConcernedPersonHandler: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    const { reminderId, concernedPersonId } = event.pathParameters;
    const reminder = await container
      .resolve(ReminderService)
      .updateConcernedPerson(
        reminderId,
        concernedPersonId,
        event?.user?.sub,
        event.body
      );

    return formatJSONResponse({ reminder }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteConcernedPersonHandler: ValidatedEventAPIGatewayProxyEvent<
  IReminderModel
> = async (event) => {
  try {
    const { concernedPersonId, reminderId } = event.pathParameters;
    // Add guard validation if required
    const reminder = await container
      .resolve(ReminderService)
      .deleteConcernedPerson(reminderId, concernedPersonId);

    return formatJSONResponse({ reminder }, 200);
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

export const getReminders = middy(getRemindersHandler).use(
  decodeJWTMiddleware()
);
export const updateReminderAssignedUser = middy(
  updateReminderAssignedUserHandler
).use(decodeJWTMiddleware());

export const createConcernedPersons = middy(createConcernedPersonsHandler).use(
  decodeJWTMiddleware()
);

export const updateConcernedPerson = middy(updateConcernedPersonHandler).use(
  decodeJWTMiddleware()
);
export const deleteConcernedPerson = middy(deleteConcernedPersonHandler).use(
  decodeJWTMiddleware()
);

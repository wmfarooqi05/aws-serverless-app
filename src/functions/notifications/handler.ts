import "reflect-metadata";

import {
  INotificationModel,
  INotificationPaginated,
} from "@models/Notification";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { NotificationService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";

export const createNotification: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  try {
    const newNotification = await container
      .resolve(NotificationService)
      .createNotification(event.body);
    return formatJSONResponse(newNotification, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getNotificationsHandler: ValidatedEventAPIGatewayProxyEvent<
  INotificationPaginated
> = async (event) => {
  try {
    const notifications = await container
      .resolve(NotificationService)
      .getNotifications(event.user?.sub, event.queryStringParameters);
    return formatJSONResponse(notifications, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getNotificationById: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  const { id } = event.pathParameters;
  try {
    const notifications = await container
      .resolve(NotificationService)
      .getNotificationById(event.user?.sub, id);
    return formatJSONResponse(notifications, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateNotificationsReadStatus: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  try {
    console.log("event.body", event.body);
    const updatedNotification = await container
      .resolve(NotificationService)
      .updateNotificationsReadStatus(event.body);
    return formatJSONResponse(updatedNotification, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const deleteNotification: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  try {
    const { notificationId } = event.pathParameters;
    await container
      .resolve(NotificationService)
      .deleteNotification(notificationId);
    return formatJSONResponse(
      { message: "Notification deleted successfully" },
      200
    );
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getNotifications = middy(getNotificationsHandler).use(
  decodeJWTMiddleware()
);
export const updateNotificationAssignedUser = middy(
  updateNotificationAssignedUserHandler
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

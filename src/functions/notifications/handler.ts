import "reflect-metadata";

import {
  INotificationModel,
  INotificationPaginated,
} from "@models/Notification";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { NotificationService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";

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
      .getNotifications(event.employee, event.queryStringParameters || {});
    return formatJSONResponse(notifications, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getNotificationByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  const { id } = event.pathParameters;
  try {
    const notifications = await container
      .resolve(NotificationService)
      .getNotificationById(event.employee?.sub, id);
    return formatJSONResponse(notifications, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateNotificationsReadStatusHandler: ValidatedEventAPIGatewayProxyEvent<
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

export const getNotifications = checkRolePermission(
  getNotificationsHandler,
  "COMPANY_READ_ALL"
);
export const getNotificationById = checkRolePermission(
  getNotificationByIdHandler,
  "COMPANY_READ_ALL"
);

export const updateNotificationsReadStatus = checkRolePermission(
  updateNotificationsReadStatusHandler,
  "COMPANY_READ_ALL"
);

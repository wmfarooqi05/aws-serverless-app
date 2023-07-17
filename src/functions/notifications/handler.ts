import "reflect-metadata";

import {
  INotification,
  INotificationModel,
  INotificationPaginated,
} from "@models/Notification";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { NotificationService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";
import { SQSRecord } from "aws-lambda";

/** @DEV */
export const createNotificationHandler: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  try {
    const newNotification = await container
      .resolve(NotificationService)
      .createNotification(JSON.parse(event.body));
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
      .getNotifications(event.employee, event.query || {});
    return formatJSONResponse(notifications, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getNotificationByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  INotificationModel
> = async (event) => {
  const { id } = event.params;
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

export const sqsHandle = async (event) => {
  try {
    const updatedNotification = await container
      .resolve(NotificationService)
      .sendWebSocketNotificationFromSQS(event.body);
    return formatJSONResponse(updatedNotification, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const sendTestMessage = async (event) => {
  try {
    const newMessage = await container
      .resolve(NotificationService)
      .sendTestMessage(event.body);
    return formatJSONResponse(newMessage, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// Websockets
export async function getAllWebsocketConnections() {
  try {
    const connections = await await container
      .resolve(NotificationService)
      .getAllWebsocketConnections();
    return formatJSONResponse(connections, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
}

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

export const createNotification = checkRolePermission(
  createNotificationHandler,
  "COMPANY_READ_ALL"
);


// these are dev only functions
export const broadcastMessage = sendTestMessage;
export const getAllConnections = getAllWebsocketConnections;


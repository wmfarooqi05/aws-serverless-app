//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const createNotification = {
  handler: `${handlerPath(__dirname)}/handler.createNotification`,
  events: [
    {
      http: {
        method: "post",
        path: "notification",
        cors: true,
      },
    },
  ],
};

const getNotifications = {
  handler: `${handlerPath(__dirname)}/handler.getNotifications`,
  events: [
    {
      http: {
        method: "get",
        path: "notifications",
        cors: true,
        // authorizer: {
        //   type: "COGNITO_USER_POOLS",
        //   authorizerId: {
        //     Ref: "ApiGatewayAuthorizer"
        //   }
        // },
      },
    },
  ],
};

const getNotificationById = {
  handler: `${handlerPath(__dirname)}/handler.getNotificationById`,
  events: [
    {
      http: {
        method: "get",
        path: "notification/{notificationId}",
        cors: true,
      },
    },
  ],
};

const updateNotification = {
  handler: `${handlerPath(__dirname)}/handler.updateNotification`,
  events: [
    {
      http: {
        method: "put",
        path: "notification/{notificationId}",
        cors: true,
      },
    },
  ],
};

const deleteNotification = {
  handler: `${handlerPath(__dirname)}/handler.deleteNotification`,
  events: [
    {
      http: {
        method: "delete",
        path: "notification/{notificationId}",
        cors: true,
      },
    },
  ],
};

export {
  getNotifications,
  createNotification,
  getNotificationById,
  updateNotification,
  deleteNotification,
};

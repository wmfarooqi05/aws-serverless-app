//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const notificationHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "get",
        path: "notification",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "notification",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "notification/{id}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "notification",
        cors: true,
      },
    },
    // Websocket events
    {
      http: {
        method: "post",
        path: "websocket/broadcast",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "websocket/get-connections",
        cors: true,
      },
    },
  ],
};

const notificationQueueInvokeHandler = {
  handler: `${handlerPath(__dirname)}/handler.notificationQueueInvokeHandler`,
  events: [
    {
      sqs: {
        arn: "arn:aws:sqs:${self:provider.region}:${aws:accountId}:job_queue_dev",
      },
    },
  ],
  // timeout: 5,
};

if (process.env.NODE_ENV === "local") {
  console.log("adding sqs handler");
  notificationHandler.events.push({
    http: {
      method: "post",
      path: "notification-queue",
      cors: true,
    },
  });
}

export { notificationHandler, notificationQueueInvokeHandler };

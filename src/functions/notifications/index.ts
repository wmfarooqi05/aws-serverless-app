//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

console.log("queue name", process.env.QUEUE_NAME);
console.log("JOBS_TABLE", process.env.JOBS_TABLE);
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

export { notificationHandler };

import { handlerPath } from "@libs/handler-resolver";

const webSocketHandler = {
  handler: `${handlerPath(__dirname)}/handler.webSocketHandler`,
  events: [
    {
      websocket: "$connect",
    },
    {
      websocket: "$disconnect",
    },
    {
      websocket: "$default",
    },
  ],
  // vpc: "~",
};

const broadcastMessage = {
  handler: `${handlerPath(__dirname)}/handler.broadcastMessage`,
  // vpc: "~",
  events: [
    {
      http: {
        method: "post",
        path: "websocket/broadcast",
        cors: true,
        // vpc: "~"
      },
    },
  ],
  // vpc: "~",
};

const getAllWebSocketConnections = {
  handler: `${handlerPath(__dirname)}/handler.getAllConnections`,
  events: [
    {
      http: {
        method: "get",
        path: "websocket/get-connections",
        cors: true,
      },
    },
  ],
};

export { webSocketHandler, broadcastMessage, getAllWebSocketConnections };

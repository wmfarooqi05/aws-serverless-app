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
};

const broadcastMessage = {
  handler: `${handlerPath(__dirname)}/handler.broadcastMessage`,
};

const getAllWebSocketConnections = {
  handler: `${handlerPath(__dirname)}/handler.getAllConnections`,
};

export { webSocketHandler, broadcastMessage, getAllWebSocketConnections };

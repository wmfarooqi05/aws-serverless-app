import { WebSocketService } from "./service";
import { container } from "@common/container";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import {
  decodeJWTMiddleware,
  decodeJWTMiddlewareWebsocket,
} from "@common/middlewares/decode-jwt";
import middy from "@middy/core";
import jwtMWrapper from "@libs/middlewares/jwtMiddleware";

const colors = [
  "\x1b[36m%s\x1b[0m",
  "\x1b[32m",
  "\x1b[33m",
  "\x1b[34m",
  "\x1b[35m",
];
export const _webSocketHandler = async (event) => {
  const {
    body,
    requestContext: { connectionId, routeKey },
  } = event;
  console.log(
    colors[Math.floor(Math.random() * 5)],
    "[Websocket] _webSocketHandler",
    routeKey,
    connectionId,
    body
  );
  try {
    const newReminder = await container
      .resolve(WebSocketService)
      .handle(
        event.employee?.sub,
        body,
        connectionId,
        routeKey
      );
    return formatJSONResponse(newReminder, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const sendMessage = async (event) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  const { body } = event;

  try {
    const newMessage = await container
      .resolve(WebSocketService)
      .sendMessage(body);
    return formatJSONResponse(newMessage, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export async function _getAllConnections() {
  try {
    const connections = await await container
      .resolve(WebSocketService)
      .getAllConnections();
    return formatJSONResponse(connections, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
}
export const webSocketHandler = middy(_webSocketHandler).use(
  decodeJWTMiddlewareWebsocket()
);

// export const webSocketHandler = jwtMWrapper(_webSocketHandler);
export const broadcastMessage = sendMessage;
export const getAllConnections = _getAllConnections;

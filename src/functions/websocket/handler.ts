import { WebSocketService } from "./service";
import { container } from "@common/container";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { jwtWebsocketMiddlewareWrapper } from "@libs/middlewares/jwtMiddleware";

export const _webSocketHandler = async (event) => {
  const {
    body,
    requestContext: { connectionId, routeKey },
  } = event;
  try {
    const websocketResponse = await container
      .resolve(WebSocketService)
      .handle(event.employee?.sub, body, connectionId, routeKey);
    return formatJSONResponse(websocketResponse, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const webSocketHandler =
  jwtWebsocketMiddlewareWrapper(_webSocketHandler);

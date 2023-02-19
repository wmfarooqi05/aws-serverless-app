import { WebSocketService } from "./service";
import { container } from "@common/container";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { decodeJWTMiddleware } from "@common/middlewares/decode-jwt";
import middy from "@middy/core";
import jwtMWrapper from "@libs/middlewares/jwtMiddleware";

// const dynamodb = new AWS.DynamoDB.DocumentClient();

// const connectionTable = process.env.CONNECTIONS_TABLE;

export const _webSocketHandler = async (event, context) => {
  // For debug purposes only.
  // You should not log any sensitive information in production.
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  const {
    body,
    requestContext: { connectionId, routeKey },
  } = event;

  try {
    const newReminder = await container
      .resolve(WebSocketService)
      .handle('', body, connectionId, routeKey);
    return formatJSONResponse(newReminder, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const sendMessage = async (event) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  const {
    body,
    requestContext: { connectionId },
  } = event;

  try {
    const newReminder = await container
      .resolve(WebSocketService)
      .sendMessage(body, connectionId);
    return formatJSONResponse(newReminder, 201);
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
  // const { Items, LastEvaluatedKey } = await dynamodb.scan({
  //     TableName: connectionTable,
  //     AttributesToGet: ['connectionId']
  // }).promise();
  // const connections = Items.map(({ connectionId }) => connectionId);
  // if (LastEvaluatedKey) {
  //     connections.push(...await getAllConnections());
  // }
  // return connections;
}
// export const wsHandler = middy(websocketHandler).use(decodeJWTMiddleware());

export const webSocketHandler = _webSocketHandler;//jwtMWrapper(_webSocketHandler);
export const broadcastMessage = sendMessage;
export const getAllConnections = _getAllConnections;

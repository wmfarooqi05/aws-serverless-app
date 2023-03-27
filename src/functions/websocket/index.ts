import { handlerPath } from "@libs/handler-resolver";

const webSocketHandler = {
  handler: `${handlerPath(__dirname)}/handler.webSocketHandler`,
  events: [
    {
      websocket: "$connect",
      // authorizer: {
      //   arn: "${self:custom.cognitoAuthorizerArn}",
      // },
    },
    {
      websocket: "$disconnect",
      // authorizer: {
      //   arn: "${self:custom.cognitoAuthorizerArn}",
      // },
    },
    {
      websocket: "$default",
      // authorizer: {
      //   arn: "${self:custom.cognitoAuthorizerArn}",
      // },
    },
  ],
};

const broadcastMessage = {
  handler: `${handlerPath(__dirname)}/handler.broadcastMessage`,
  events: [
    {
      http: {
        method: "post",
        path: "websocket/broadcast",
        cors: true,
      },
    },
  ],
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

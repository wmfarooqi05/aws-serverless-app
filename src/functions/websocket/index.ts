import { handlerPath } from "@libs/handler-resolver";

const webSocketHandler = {
  handler: `${handlerPath(__dirname)}/handler.webSocketHandler`,
  events: [
    {
      websocket: {
        route: "$connect",
        authorizer: "${self:custom.cognitoAuthorizerArn}",
      },
    },
    {
      websocket: {
        route: "$disconnect",
        authorizer: "${self:custom.cognitoAuthorizerArn}",
      },
    },
    {
      websocket: {
        route: "$default",
        authorizer: "${self:custom.cognitoAuthorizerArn}",
      },
    },
  ],
};

export { webSocketHandler };

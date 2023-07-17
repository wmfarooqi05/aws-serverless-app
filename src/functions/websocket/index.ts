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

export { webSocketHandler };

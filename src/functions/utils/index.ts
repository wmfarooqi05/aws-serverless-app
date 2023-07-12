//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const utilsHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "generate-signed-url",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "get-public-urls",
        cors: true,
      },
    },
  ],
  layers: ["arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:jobs-packages:5"],
};

export { utilsHandler };

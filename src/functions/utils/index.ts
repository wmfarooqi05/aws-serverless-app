//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const utilsHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "upload",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "generate-signed-url",
        cors: true,
      },
    },
  ],
  layers: ["arn:aws:lambda:ca-central-1:524073432557:layer:jobs-packages:3"],
};

export { utilsHandler };

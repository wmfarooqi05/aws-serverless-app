//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const notificationHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "get",
        path: "notification",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "notification",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "notification/{id}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "notification",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export { notificationHandler };

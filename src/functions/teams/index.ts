//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const teamHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "team",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "team",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "team/{teamId}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "team/{teamId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "team/{teamId}",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export { teamHandler };

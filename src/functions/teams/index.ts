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
};

export { teamHandler };

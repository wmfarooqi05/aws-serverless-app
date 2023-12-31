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
    {
      http: {
        method: "post",
        path: "team/{teamId}/add-employee/{employeeId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "team/{teamId}/remove-employee/{employeeId}",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

export { teamHandler };

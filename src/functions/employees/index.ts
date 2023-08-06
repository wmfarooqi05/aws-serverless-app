//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const employeeHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "get",
        path: "employees-summary",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "employees",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "employee/profile",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "employee/profile",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "employee/{employeeId}/profile",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "employee/avatar",
        cors: true,
      },
    },
  ],
};

export { employeeHandler };

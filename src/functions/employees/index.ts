//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const getEmployees = {
  handler: `${handlerPath(__dirname)}/handler.getEmployees`,
  events: [
    {
      http: {
        method: "get",
        path: "employees",
        cors: true,
      },
    },
  ],
};

const getEmployeesWorkSummary = {
  handler: `${handlerPath(__dirname)}/handler.getEmployeesWorkSummary`,
  events: [
    {
      http: {
        method: "get",
        path: "employees-summary",
        cors: true,
      },
    },
  ],
};

export { getEmployees, getEmployeesWorkSummary };

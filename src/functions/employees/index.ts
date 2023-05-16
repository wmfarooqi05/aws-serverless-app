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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export { getEmployees, getEmployeesWorkSummary };

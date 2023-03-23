import "reflect-metadata";

import { IEmployeePaginated } from "@models/Employees";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { EmployeeService } from "./service";

import { allowRoleWrapper } from "@libs/middlewares/jwtMiddleware";
import { RolesEnum } from "@models/interfaces/Employees";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";

const getEmployeesHandler: ValidatedEventAPIGatewayProxyEvent<
  IEmployeePaginated
> = async (event) => {
  try {
    const employees = await container
      .resolve(EmployeeService)
      .getEmployees(event.employee?.sub, event.queryStringParameters);
    return formatJSONResponse(employees, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getEmployeesWorkSummaryHandler: ValidatedEventAPIGatewayProxyEvent<
  IEmployeePaginated
> = async (event) => {
  try {
    const employees = await container
      .resolve(EmployeeService)
      .getEmployeesWorkSummary(event.employee, event.queryStringParameters);
    return formatJSONResponse(employees, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getEmployees = allowRoleWrapper(
  getEmployeesHandler,
  RolesEnum.SALES_MANAGER_GROUP
);

export const getEmployeesWorkSummary = allowRoleWrapper(
  getEmployeesWorkSummaryHandler,
  RolesEnum.SALES_MANAGER_GROUP
);

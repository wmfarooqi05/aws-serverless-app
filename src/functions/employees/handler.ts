import "reflect-metadata";

import { IEmployeePaginated } from "@models/Employees";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { EmployeeService } from "./service";

import { checkRolePermission } from "@middlewares/jwtMiddleware";

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
      .getEmployees(event.employee?.sub, event.query);
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
      .getEmployeesWorkSummary(event.employee, event.query);
    return formatJSONResponse(employees, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getProfileHandler = async (event) => {
  try {
    const employees = await container
      .resolve(EmployeeService)
      .getProfile(event.employee);
    return formatJSONResponse(employees, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createProfileHandler = async (event) => {
  try {
    const employees = await container
      .resolve(EmployeeService)
      .createProfile(event.employee, event.body);
    return formatJSONResponse(employees, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateMyProfileHandler = async (event) => {
  try {
    const employees = await container
      .resolve(EmployeeService)
      .updateMyProfile(event.employee, event.body);
    return formatJSONResponse(employees, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getEmployees = checkRolePermission(
  getEmployeesHandler,
  "COMPANY_READ_ALL"
);

export const getEmployeesWorkSummary = checkRolePermission(
  getEmployeesWorkSummaryHandler,
  "COMPANY_READ_ALL"
);

export const getProfile = checkRolePermission(
  getProfileHandler,
  "COMPANY_READ_ALL"
);

export const createProfile = checkRolePermission(
  createProfileHandler,
  "COMPANY_READ_ALL"
);

export const updateMyProfile = checkRolePermission(
  updateMyProfileHandler,
  "COMPANY_READ_ALL"
);

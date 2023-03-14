import "reflect-metadata";

import {
  IEmployeeModel,
  IEmployeePaginated,
  RolesEnum,
} from "@models/Employees";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { EmployeeService } from "./service";
import middy from "@middy/core";
import {
  allowRoleAndAbove,
  decodeJWTMiddleware,
  jwtRequired,
} from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import jwtMiddlewareWrapper from "@libs/middlewares/jwtMiddleware";

// export const createEmployee: ValidatedEventAPIGatewayProxyEvent<
//   IEmployeeModel
// > = async (event) => {
//   try {
//     const newEmployee = await container
//       .resolve(EmployeeService)
//       .createEmployee(event.body);
//     return formatJSONResponse(newEmployee, 201);
//   } catch (e) {
//     return formatErrorResponse(e);
//   }
// };

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

// export const getEmployeeById: ValidatedEventAPIGatewayProxyEvent<
//   IEmployeeModel
// > = async (event) => {
//   const { id } = event.pathParameters;
//   try {
//     const employees = await container
//       .resolve(EmployeeService)
//       .getEmployeeById(event.employee?.sub, id);
//     return formatJSONResponse(employees, 200);
//   } catch (e) {
//     return formatErrorResponse(e);
//   }
// };

// export const updateEmployeesReadStatus: ValidatedEventAPIGatewayProxyEvent<
//   IEmployeeModel
// > = async (event) => {
//   try {
//     console.log("event.body", event.body);
//     const updatedEmployee = await container
//       .resolve(EmployeeService)
//       .updateEmployeesReadStatus(event.body);
//     return formatJSONResponse(updatedEmployee, 200);
//   } catch (e) {
//     console.log("e", e);
//     return formatErrorResponse(e);
//   }
// };

// export const deleteEmployee: ValidatedEventAPIGatewayProxyEvent<
//   IEmployeeModel
// > = async (event) => {
//   try {
//     const { employeeId } = event.pathParameters;
//     await container
//       .resolve(EmployeeService)
//       .deleteEmployee(employeeId);
//     return formatJSONResponse(
//       { message: "Employee deleted successfully" },
//       200
//     );
//   } catch (e) {
//     return formatErrorResponse(e);
//   }
// };

export const getEmployees = middy(getEmployeesHandler)
  .use(decodeJWTMiddleware())
  .use(jwtRequired())
  .use(allowRoleAndAbove(RolesEnum.SALES_MANAGER_GROUP));

// export const updateEmployeeAssignedEmployee = middy(
//   updateEmployeeAssignedEmployeeHandler
// ).use(decodeJWTMiddleware());

// export const createConcernedPersons = middy(createConcernedPersonsHandler).use(
//   decodeJWTMiddleware()
// );

// export const updateConcernedPerson = middy(updateConcernedPersonHandler).use(
//   decodeJWTMiddleware()
// );
// export const deleteConcernedPerson = middy(deleteConcernedPersonHandler).use(
//   decodeJWTMiddleware()
// );

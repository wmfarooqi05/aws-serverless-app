//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

// const createEmployee = {
//   handler: `${handlerPath(__dirname)}/handler.createEmployee`,
//   events: [
//     {
//       http: {
//         method: "post",
//         path: "employee",
//         cors: true,
//       },
//     },
//   ],
// };

const getEmployees = {
  handler: `${handlerPath(__dirname)}/handler.getEmployees`,
  events: [
    {
      http: {
        method: "get",
        path: "employees",
        cors: true,
        // authorizer: {
        //   type: "COGNITO_EMPLOYEE_POOLS",
        //   authorizerId: {
        //     Ref: "ApiGatewayAuthorizer"
        //   }
        // },
      },
    },
  ],
};

// const getEmployeeById = {
//   handler: `${handlerPath(__dirname)}/handler.getEmployeeById`,
//   events: [
//     {
//       http: {
//         method: "get",
//         path: "employee/{id}",
//         cors: true,
//       },
//     },
//   ],
// };

// const updateEmployee = {
//   handler: `${handlerPath(__dirname)}/handler.updateEmployeesReadStatus`,
//   events: [
//     {
//       http: {
//         method: "put",
//         path: "employee",
//         cors: true,
//       },
//     },
//   ],
// };

// const deleteEmployee = {
//   handler: `${handlerPath(__dirname)}/handler.deleteEmployee`,
//   events: [
//     {
//       http: {
//         method: "delete",
//         path: "employee/{employeeId}",
//         cors: true,
//       },
//     },
//   ],
// };

export {
  getEmployees,
  // createEmployee,
  // getEmployeeById,
  // updateEmployee,
  // deleteEmployee,
};

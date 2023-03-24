import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { HandlerLambda, MiddlewareObject } from "middy";
// import createHttpError from "http-errors";
import { decode } from "jsonwebtoken";
import {
  Actions,
  getPermissionsForEmployeeRole2,
  ModuleTypeForCasl,
} from "@libs/casl";
import { ForbiddenError } from "@casl/ability";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { formatErrorResponse } from "@libs/api-gateway";
import { roleKey, RolesArray, RolesEnum } from "@models/interfaces/Employees";

export const decodeJWTMiddleware = () => {
  return {
    before: ({ event }) => {
      // @TODO dont send extra things in event.employee
      const token = event.headers?.Authorization?.split(" ")[1];
      event.employee = decode(token);
      // we need to handle cognito auth custom way to gain more control
      // V2 will cover this
    },
  };
};

export const decodeJWTMiddlewareWebsocket = () => {
  return {
    before: ({ event }) => {
      // @TODO dont send extra things in event.employee
      if (event.queryStringParameters?.Authorization) {
        const token = event.queryStringParameters?.Authorization?.split(" ")[1];
        event.employee = decode(token);
        event.employee.teamId = "team0"; // @TODO fix this with cognito auth
      }
    },
  };
};

export function permissionMiddleware(): MiddlewareObject<
  APIGatewayEvent,
  APIGatewayProxyResult
> {
  return {
    before: async (
      handler: HandlerLambda<APIGatewayEvent, APIGatewayProxyResult>
    ): Promise<void> => {
      console.log("employee", handler.event.headers.employee);
    },
  };
}

export const jwtRequired = () => {
  return {
    before: ({ event }) => {
      try {
        const role = event?.employee?.[roleKey][0] || "";
        const roleFound = RolesArray.find((x) => x === role) ? true : false;

        event.employee[roleKey] = [
          RolesArray[RolesEnum.ADMIN_GROUP],
        ];

        // @DEV
        if (event.employee?.sub) {
          event.employee.teamId = "team0"; // @TODO fix this with cognito auth
        }

        if (!(roleFound && event?.employee?.sub && event?.employee?.teamId)) {
          console.log("Auth Token missing or invalid");
          return formatErrorResponse({
            message: "Auth Token missing or invalid",
            statusCode: 403,
          });
        }
      } catch (e) {
        return formatErrorResponse({
          message: "Auth Token missing or invalid",
          statusCode: 403,
        });
      }
    },
  };
};

export const allowRoleAndAbove = (permittedRole: number) => {
  return {
    before: ({ event }) => {
      if (RolesEnum[event.employee[roleKey]] < permittedRole) {
        return formatErrorResponse({
          message: "Current role is not authorized to access this data",
          statusCode: 403,
        });
      }
    },
  };
};

/**
 @deprecated do not use this
*/
export const permissionMiddleware2 = (
  actions: Actions[],
  subject: ModuleTypeForCasl
) => {
  return {
    before: async ({ event }) => {
      const { employee } = event;
      employee.role = "manager";
      // Why are we fetching this???
      // const resp: ICompany[] = await container
      //   .resolve(DatabaseService)
      //   .get(COMPANIES_TABLE_NAME);
      // console.log("employee", resp[0]?.companyName);
      const permissions = getPermissionsForEmployeeRole2();
      const abc = permissions["manager"].rulesFor("all", "COMPANY");
      console.log("rules", abc);
      try {
        // add a pending-approval permission in header
        // service will check which action is permitted.
        // to keep logic separate
        actions.forEach((action) =>
          ForbiddenError.from(permissions[employee.role]).throwUnlessCan(
            action,
            subject
          )
        );
      } catch (e) {
        return formatErrorResponse(e);
      }
    },
  };
};

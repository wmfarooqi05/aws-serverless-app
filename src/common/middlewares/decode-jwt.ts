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
import {
  IRoles,
  roleKey,
  RolesArray,
  RolesEnum,
} from "@models/interfaces/Employees";
import {
  returnUnAuthorizedError,
  throwUnAuthorizedError,
} from "@common/errors";
import {
  accessPermissionsCacheMap,
  PERMISSION_KEY,
} from "@models/AccessPermissions";
import { checkIfPermittedWithSpecialPermission } from "./helper";

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

        // event.employee[roleKey] = [RolesArray[RolesEnum.ADMIN_GROUP]];

        // @DEV
        if (event.employee?.sub) {
          event.employee.teamId = "f861b2dc-b1b9-4c59-9047-99bcfeca9cda"; // @TODO fix this with cognito auth
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

/**
 * @deprecated
 * @param permissionKey Remove role and fetch the permissions and verify instead
 * @returns
 */
export const allowRoleAndAbove = (permissionKey: PERMISSION_KEY) => {
  return {
    before: async ({ event }) => {
      const { permitted, createPendingApproval } = await getPermittedRole(
        event.employee[roleKey],
        permissionKey
      );
      event.employee = {
        ...event.employee,
        permitted,
        createPendingApproval,
      };
      if (!permitted && !createPendingApproval) {
        return formatErrorResponse({
          message: "Current role is not authorized to access this data",
          statusCode: 403,
        });
      }
    },
  };
};

export const getPermittedAndApprovalFlags = (permissionKey: PERMISSION_KEY) => {
  return {
    before: async ({ event }) => {
      const permittedRole = await getPermittedRole(
        event.employee[roleKey],
        permissionKey
      );
      event.employee = {
        ...event.employee,
        ...permittedRole,
      };
    },
  };
};

export const validatePermissions = (
  urlParamKey: string = null,
  employeeRelationKey: string = null
) => {
  return {
    before: async ({ event }) => {
      const {
        permitted,
        createPendingApproval,
        specialPermissions,
        tableName,
      } = event.employee;
      if (!permitted) {
        if (!specialPermissions && createPendingApproval) {
          return;
        } else if (!specialPermissions && !createPendingApproval) {
          return returnUnAuthorizedError();
        }
        const specialPermitted = await checkIfPermittedWithSpecialPermission(
          event,
          tableName,
          urlParamKey,
          employeeRelationKey
        );
        if (!specialPermitted && !createPendingApproval) {
          return returnUnAuthorizedError();
        }
      }
    },
  };
};

export const allowOnlyMe = (key: string) => {
  return {
    before: ({ event }) => {
      // @TODO remove me
      if (event.employee.sub !== event[key] || event[key] !== "me") {
        throwUnAuthorizedError();
      }
      if (event[key] === "me") {
        event[key] = event.employee.sub;
      }
    },
  };
};

/**
 * @deprecated
 * @param permittedRole
 * @param key
 * @returns
 */
export const allowMeOrRole = (
  permittedRole: number = RolesEnum.SALES_REP_GROUP,
  key: string
) => {
  return {
    before: ({ event }) => {
      let isAllowed = false;
      if (event.employee.sub === event[key] || event[key] === "me") {
        isAllowed = true;
        if (event[key] === "me") {
          event[key] = event.employee.sub;
        }
      }

      if (RolesEnum[event.employee[roleKey]] >= permittedRole) {
        isAllowed = true;
      }

      if (!isAllowed) {
        throwUnAuthorizedError();
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

export const getPermittedRole = async (
  employeeRole: IRoles,
  permissionKey: PERMISSION_KEY
): Promise<{
  permitted: boolean;
  createPendingApproval: boolean;
  specialPermissions: boolean;
  tableName: string;
}> => {
  const {
    role: permittedRole,
    createPendingApproval,
    tableName,
    specialPermissions,
  } = accessPermissionsCacheMap[permissionKey];
  const permitted = RolesEnum[employeeRole] >= RolesEnum[permittedRole];

  return { permitted, createPendingApproval, specialPermissions, tableName };
};

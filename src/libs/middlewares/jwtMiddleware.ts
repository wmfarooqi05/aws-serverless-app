import {
  allowMeOrRole,
  allowOnlyMe,
  allowRoleAndAbove,
  decodeJWTMiddleware,
  decodeJWTMiddlewareWebsocket,
  getPermittedAndApprovalFlags,
  jwtRequired,
  validatePermissions,
} from "@common/middlewares/decode-jwt";
import middy from "@middy/core";
import { PERMISSION_KEY } from "@models/AccessPermissions";
import { RolesEnum } from "@models/interfaces/Employees";

const jwtMiddlewareWrapper = (func: any) => {
  return middy(func).use(decodeJWTMiddleware());
};

export const jwtRequiredWrapper = (func) => {
  return middy(func).use(decodeJWTMiddleware()).use(jwtRequired());
};

export const jwtMRequiredWrapper = (func) => {
  return middy(func).use(decodeJWTMiddlewareWebsocket()).use(jwtRequired());
};

/**
 * we have to use cognito authorizer with api gateway
 * @deprecated
 * @param func
 * @param key
 * @returns
 */
export const allowMeWrapper = (func: any, key: string) => {
  // get employeeId from event[key]
  return middy(func)
    .use(decodeJWTMiddleware())
    .use(jwtRequired())
    .use(allowOnlyMe(key));
};

export const allowMeOrRoleWrapper = (
  func: any,
  permittedRole: number = RolesEnum.SALES_REP_GROUP,
  key: string
) => {
  return middy(func)
    .use(decodeJWTMiddleware())
    .use(jwtRequired())
    .use(allowMeOrRole(permittedRole, key));
};

/**
 * @deprecated
 * @param func
 * @param role Permitted Role (Default: Sales Rep)
 * @param createPendingApproval In case of no permission, should it create pending approval instead or reject access?
 * @returns
 */
export const allowRoleWrapper = (
  func: any,
  role: number = RolesEnum.SALES_REP_GROUP
) => {
  return middy(func)
    .use(decodeJWTMiddleware())
    .use(jwtRequired())
    .use(allowRoleAndAbove("*"));
};

/**
 * @param func
 * @param role Permitted Role (Default: Sales Rep)
 * @param createPendingApproval In case of no permission, should it create pending approval instead or reject access?
 * @returns
 */
export const checkRolePermission = (
  func: any,
  permissionKey: PERMISSION_KEY,
  urlParamKey: string = null,
  employeeRelationKey: string = null
) => {
  return middy(func)
    .use(decodeJWTMiddleware())
    .use(jwtRequired())
    .use(getPermittedAndApprovalFlags(permissionKey))
    .use(validatePermissions(urlParamKey, employeeRelationKey));
};

export default jwtMiddlewareWrapper;

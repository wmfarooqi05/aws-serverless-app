import {
  allowMeOrRole,
  allowOnlyMe,
  allowRoleAndAbove,
  decodeJWTMiddleware,
  decodeJWTMiddlewareWebsocket,
  jwtRequired,
} from "@common/middlewares/decode-jwt";
import middy from "@middy/core";
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

export const allowRoleWrapper = (
  func: any,
  role: number = RolesEnum.SALES_REP_GROUP
) => {
  return middy(func)
    .use(decodeJWTMiddleware())
    .use(jwtRequired())
    .use(allowRoleAndAbove(role));
};

export default jwtMiddlewareWrapper;

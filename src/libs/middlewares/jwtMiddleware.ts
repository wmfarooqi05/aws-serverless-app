import {
  allowRoleAndAbove,
  decodeJWTMiddleware,
  jwtRequired,
} from "@common/middlewares/decode-jwt";
import middy from "@middy/core";
import { RolesEnum } from "@models/interfaces/Employees";

const jwtMiddlewareWrapper = (func: any) => {
  return middy(func).use(decodeJWTMiddleware());
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

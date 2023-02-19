import { decodeJWTMiddleware } from "@common/middlewares/decode-jwt";
import middy from "@middy/core";

const jwtMiddlewareWrapper = (func: any) => {
  return middy(func).use(decodeJWTMiddleware());
};

export default jwtMiddlewareWrapper;
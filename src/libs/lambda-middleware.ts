import middy from "@middy/core"

export const middyfy = (handler, middlewares) => {
  return middy(handler).use(middlewares);
}

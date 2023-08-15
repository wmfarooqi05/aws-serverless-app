//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const googleOauthHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "google/oauth",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "google/oauth/extendToken",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "google/oauth/googleOauthTokenScope",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "google/oauth/callback",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

export { googleOauthHandler };

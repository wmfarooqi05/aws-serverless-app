//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const googleOauthHandler = {
  handler: `${handlerPath(__dirname)}/handler.oauthHandler`,
  events: [
    {
      http: {
        method: "post",
        path: "google/oauth",
        cors: true,
      },
    },
  ],
};

const googleOauthCallbackHandler = {
  handler: `${handlerPath(__dirname)}/handler.googleOauthCallbackHandler`,
  events: [
    {
      http: {
        method: "get",
        path: "google/oauth/callback",
        cors: true,
      },
    },
  ],
};

const googleOauthExtendRefreshToken = {
  handler: `${handlerPath(__dirname)}/handler.googleOauthExtendRefreshToken`,
  events: [
    {
      http: {
        method: "post",
        path: "google/oauth/extendToken",
        cors: true,
      },
    },
  ],
};

const googleOauthTokenScope = {
  handler: `${handlerPath(__dirname)}/handler.googleOauthTokenScope`,
  events: [
    {
      http: {
        method: "post",
        path: "google/oauth/googleOauthTokenScope",
        cors: true,
      },
    },
  ],
};

export { googleOauthCallbackHandler, googleOauthHandler, googleOauthExtendRefreshToken, googleOauthTokenScope };

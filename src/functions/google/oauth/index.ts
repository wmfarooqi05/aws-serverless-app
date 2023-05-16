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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export {
  googleOauthCallbackHandler,
  googleOauthHandler,
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,
};

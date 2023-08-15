import { AWS } from "@serverless/typescript";

export const googleEndpointEvents: AWS["functions"][0]["events"] = [
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
  {
    http: {
      method: "get",
      path: "google/calendars",
      cors: true,
    },
  },
];

//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";
import { googleEndpointEvents } from "./google";

const activitiesHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "get",
        path: "company/{companyId}/activities",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "activities",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "my-activities",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "top-activities/{companyId}",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "my-activities-by-status-time",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "activities/stale",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "activity/{activityId}",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "activity",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "activity/{activityId}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "activity/{activityId}/status/{status}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "activity/{activityId}",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "activity/{activityId}/remarks",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "activity/{activityId}/remarks/{remarksId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "activity/{activityId}/remarks/{remarksId}",
        cors: true,
      },
    },
  ],
  layers: [
    "arn:aws:lambda:${self:provider.region}:${aws:accountId}:layer:googleapis_111_0_0:2",
  ],
};

activitiesHandler.events.push(...(googleEndpointEvents as any[]));

export { activitiesHandler };

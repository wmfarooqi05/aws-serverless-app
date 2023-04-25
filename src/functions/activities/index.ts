//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

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
};

export { activitiesHandler };

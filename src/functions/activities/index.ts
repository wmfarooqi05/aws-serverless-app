//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const getAllActivitiesByCompany = {
  handler: `${handlerPath(__dirname)}/handler.getAllActivitiesByCompany`,
  events: [
    {
      http: {
        method: "get",
        path: "company/{companyId}/activities",
        cors: true,
      },
    },
  ],
};

const getActivities = {
  handler: `${handlerPath(__dirname)}/handler.getActivities`,
  events: [
    {
      http: {
        method: "get",
        path: "activities",
        cors: true,
      },
    },
  ],
};

const getMyActivities = {
  handler: `${handlerPath(__dirname)}/handler.getMyActivities`,
  events: [
    {
      http: {
        method: "get",
        path: "my-activities",
        cors: true,
      },
    },
  ],
};

const getTopActivities = {
  handler: `${handlerPath(__dirname)}/handler.getTopActivities`,
  events: [
    {
      http: {
        method: "get",
        path: "top-activities/{companyId}",
        cors: true,
      },
    },
  ],
};

const getMyStaleActivityByStatus = {
  handler: `${handlerPath(__dirname)}/handler.getMyStaleActivityByStatus`,
  events: [
    {
      http: {
        method: "get",
        path: "my-activities-by-status-time",
        cors: true,
      },
    },
  ],
};

const getActivityById = {
  handler: `${handlerPath(__dirname)}/handler.getActivityById`,
  events: [
    {
      http: {
        method: "get",
        path: "activity/{activityId}",
        cors: true,
      },
    },
  ],
};

const createActivity = {
  handler: `${handlerPath(__dirname)}/handler.createActivity`,
  events: [
    {
      http: {
        method: "post",
        path: "activity",
        cors: true,
      },
    },
  ],
};

const updateActivity = {
  handler: `${handlerPath(__dirname)}/handler.updateActivity`,
  events: [
    {
      http: {
        method: "put",
        path: "activity/{activityId}",
        cors: true,
      },
    },
  ],
};

const updateStatusOfActivity = {
  handler: `${handlerPath(__dirname)}/handler.updateStatusOfActivity`,
  events: [
    {
      http: {
        method: "put",
        path: "activity/{activityId}/status/{status}",
        cors: true,
      },
    },
  ],
};

const deleteActivity = {
  handler: `${handlerPath(__dirname)}/handler.deleteActivity`,
  events: [
    {
      http: {
        method: "delete",
        path: "activity/{activityId}",
        cors: true,
      },
    },
  ],
};

const addRemarksToActivity = {
  handler: `${handlerPath(__dirname)}/handler.addRemarksToActivity`,
  events: [
    {
      http: {
        method: "post",
        path: "activity/{activityId}/remarks",
        cors: true,
      },
    },
  ],
};

const updateRemarksInActivity = {
  handler: `${handlerPath(__dirname)}/handler.updateRemarksInActivity`,
  events: [
    {
      http: {
        method: "put",
        path: "activity/{activityId}/remarks/{remarksId}",
        cors: true,
      },
    },
  ],
};

const deleteRemarkFromActivity = {
  handler: `${handlerPath(__dirname)}/handler.deleteRemarkFromActivity`,
  events: [
    {
      http: {
        method: "delete",
        path: "activity/{activityId}/remarks/{remarksId}",
        cors: true,
      },
    },
  ],
};

export {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
  getTopActivities,
  getMyActivities,
  getAllActivitiesByCompany,

  getMyStaleActivityByStatus,
  updateStatusOfActivity,
};

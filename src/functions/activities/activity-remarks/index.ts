//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

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
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
};

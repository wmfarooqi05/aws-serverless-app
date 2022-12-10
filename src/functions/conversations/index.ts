//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const addConversation = {
  handler: `${handlerPath(__dirname)}/handler.addConversation`,
  events: [
    {
      http: {
        method: "post",
        path: "conversation",
        cors: true,
      },
    },
  ],
};

const addRemarksToConversation = {
  handler: `${handlerPath(__dirname)}/handler.addRemarksToConversation`,
  events: [
    {
      http: {
        method: "post",
        path: "remarks",
        cors: true,
      },
    },
  ],
};

const updateRemarksInConversation = {
  handler: `${handlerPath(__dirname)}/handler.updateRemarksInConversation`,
  events: [
    {
      http: {
        method: "put",
        path: "remarks",
        cors: true,
      },
    },
  ],
};

export {
  addConversation,
  addRemarksToConversation,
  updateRemarksInConversation,
};

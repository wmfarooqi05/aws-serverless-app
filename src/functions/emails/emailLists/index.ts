//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const getAllEmailLists = {
  handler: `${handlerPath(__dirname)}/handler.getAllEmailLists`,
  events: [
    {
      http: {
        method: "get",
        path: "email-lists",
        cors: true,
      },
    },
  ],
};

const addEmailList = {
  handler: `${handlerPath(__dirname)}/handler.addEmailList`,
  events: [
    {
      http: {
        method: "post",
        path: "email-list",
        cors: true,
      },
    },
  ],
};

const updateEmailList = {
  handler: `${handlerPath(__dirname)}/handler.updateEmailList`,
  events: [
    {
      http: {
        method: "put",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
  ],
};

const deleteEmailList = {
  handler: `${handlerPath(__dirname)}/handler.deleteEmailList`,
  events: [
    {
      http: {
        method: "delete",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
  ],
};

export { getAllEmailLists, addEmailList, updateEmailList, deleteEmailList };

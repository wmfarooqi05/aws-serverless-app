//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const emailHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "get",
        path: "email-list",
        cors: true,
      },
    },

    {
      http: {
        method: "post",
        path: "email-list",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
  ],
};

export { emailHandler };

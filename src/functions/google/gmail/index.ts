//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const createAndSendEmail = {
  handler: `${handlerPath(__dirname)}/handler.createAndSendEmail`,
  events: [
    {
      http: {
        method: "post",
        path: "google/gmail/create-and-send-email",
        cors: true,
      },
    },
  ],
};

export { createAndSendEmail };

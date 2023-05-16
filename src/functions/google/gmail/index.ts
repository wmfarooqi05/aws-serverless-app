//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

// remove this
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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export { createAndSendEmail };

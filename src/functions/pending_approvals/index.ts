//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const approvePendingApproval = {
  handler: `${handlerPath(__dirname)}/handler.approvePendingApproval`,
  events: [
    {
      http: {
        method: "post",
        path: "pending-approval/{requestId}/approve",
        cors: true,
      },
    },
  ],
};

const sendWebSocketNotification = {
  handler: `${handlerPath(__dirname)}/handler.sendWebSocketNotification`,
  events: [
    {
      http: {
        method: "post",
        path: "pending-approval/send-notif",
        cors: true,
      },
    },
  ],
};

export { approvePendingApproval, sendWebSocketNotification };

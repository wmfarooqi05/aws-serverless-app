//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

/** @dev */
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

const getMyPendingApprovals = {
  handler: `${handlerPath(__dirname)}/handler.getMyPendingApprovals`,
  events: [
    {
      http: {
        method: "get",
        path: "pending-approval",
        cors: true,
      },
    },
  ],
};

const approveOrRejectRequest = {
  handler: `${handlerPath(__dirname)}/handler.approveOrRejectRequest`,
  events: [
    {
      http: {
        method: "post",
        path: "pending-approval/{requestId}/approve-reject",
        cors: true,
      },
    },
  ],
};

export {
  sendWebSocketNotification,
  getMyPendingApprovals,
  approveOrRejectRequest,
};

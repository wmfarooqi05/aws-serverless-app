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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
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
  layers: [
    "arn:aws:lambda:ca-central-1:524073432557:layer:googleapis_111_0_0:2",
  ],
};

export {
  sendWebSocketNotification,
  getMyPendingApprovals,
  approveOrRejectRequest,
};

//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const pendingApprovalsHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    // {
    //   http: {
    //     method: "post",
    //     path: "pending-approval/send-notif",
    //     cors: true,
    //   },
    // },
    {
      http: {
        method: "get",
        path: "pending-approval/{requestId}",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "pending-approval",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "pending-approval/{requestId}/approve-reject",
        cors: true,
      },
    },
  ],
};

export { pendingApprovalsHandler };

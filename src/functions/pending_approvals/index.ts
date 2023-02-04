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
export { approvePendingApproval };

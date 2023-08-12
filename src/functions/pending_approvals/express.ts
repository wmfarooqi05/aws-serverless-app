import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  approveOrRejectRequest,
  getMyPendingApprovals,
  getPendingApprovalById,
} from "./handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";

app.use(expressInputParseMiddleware);

// app.get("/pending-approval/send-notif", async (req, res) => {
//   const resp = await sendWebSocketNotification(req, {} as any,);
//   expressResponseHelper(res, resp);
// });

app.get("/pending-approval/:requestId/approve-reject", async (req, res) => {
  const resp = await approveOrRejectRequest(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/pending-approval/:id", async (req, res) => {
  const resp = await getPendingApprovalById(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/pending-approval", async (req, res) => {
  const resp = await getMyPendingApprovals(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

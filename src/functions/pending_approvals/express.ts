import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  approveOrRejectRequest,
  getMyPendingApprovals,
  getPendingApprovalById,
} from "./handler";

app.use((req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
});

// app.get("/pending-approval/send-notif", async (req, res) => {
//   const resp = await sendWebSocketNotification(req, {} as any,);
//   resHelper(res, resp);
// });

app.get("/pending-approval/:requestId/approve-reject", async (req, res) => {
  const resp = await approveOrRejectRequest(req, {} as any);
  resHelper(res, resp);
});

app.get("/pending-approval/:id", async (req, res) => {
  const resp = await getPendingApprovalById(req, {} as any);
  resHelper(res, resp);
});

app.get("/pending-approval", async (req, res) => {
  const resp = await getMyPendingApprovals(req, {} as any);
  resHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

const resHelper = (res, apiResponse) => {
  res
    .status(apiResponse.statusCode || 200)
    .set(apiResponse.headers)
    .set("Content-Type", "application/json")
    .send(apiResponse.body);
};

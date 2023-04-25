import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  getNotificationById,
  getNotifications,
  updateNotificationsReadStatus,
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

app.get("/notification", async (req, res) => {
  const resp = await getNotifications(req, {} as any);
  resHelper(res, resp);
});

app.put("/notification/:id", async (req, res) => {
  const resp = await getNotificationById(req, {} as any);
  resHelper(res, resp);
});

app.put("/notification", async (req, res) => {
  const resp = await updateNotificationsReadStatus(req, {} as any);
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
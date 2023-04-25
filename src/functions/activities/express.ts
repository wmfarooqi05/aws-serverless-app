import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getMyActivities,
  getTopActivities,
  getAllActivitiesByCompany,
  getMyStaleActivityByStatus,
  updateStatusOfActivity,
  getEmployeeStaleActivityByStatus,
} from "./handler";

import {
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
} from "./activity-remarks/handler";

app.use((req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
});

app.get("/company/:companyId/activities", async (req, res) => {
  const resp = await getAllActivitiesByCompany(req, {} as any);
  resHelper(res, resp);
});

app.get("/activities", async (req, res) => {
  const resp = await getActivities(req, {} as any);
  resHelper(res, resp);
});

app.get("/my-activities", async (req, res) => {
  const resp = await getMyActivities(req, {} as any);
  resHelper(res, resp);
});

app.get("/top-activities/:companyId", async (req, res) => {
  const resp = await getTopActivities(req, {} as any);
  resHelper(res, resp);
});

app.get("/my-activities-by-status-time", async (req, res) => {
  const resp = await getMyStaleActivityByStatus(req, {} as any);
  resHelper(res, resp);
});

app.get("/activities/stale", async (req, res) => {
  const resp = await getEmployeeStaleActivityByStatus(req, {} as any);
  resHelper(res, resp);
});

app.get("/activity/:activityId", async (req, res) => {
  const resp = await getActivityById(req, {} as any);
  resHelper(res, resp);
});

app.post("/activity", async (req, res) => {
  const resp = await createActivity(req, {} as any);
  resHelper(res, resp);
});

app.put("/activity/:activityId", async (req, res) => {
  const resp = await updateActivity(req, {} as any);
  resHelper(res, resp);
});

app.put("/activity/:activityId/status/:status", async (req, res) => {
  const resp = await updateStatusOfActivity(req, {} as any);
  resHelper(res, resp);
});

app.delete("/activity/:activityId", async (req, res) => {
  const resp = await deleteActivity(req, {} as any);
  resHelper(res, resp);
});

app.post("/activity/:activityId/remarks", async (req, res) => {
  const resp = await addRemarksToActivity(req, {} as any);
  resHelper(res, resp);
});

app.put("/activity/:activityId/remarks/:remarksId", async (req, res) => {
  const resp = await updateRemarksInActivity(req, {} as any);
  resHelper(res, resp);
});

app.delete("/activity/:activityId/remarks/:remarksId", async (req, res) => {
  const resp = await deleteRemarkFromActivity(req, {} as any);
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

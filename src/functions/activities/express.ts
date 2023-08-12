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
  getAllCalendars,
} from "./handler";

import {
  addRemarksToActivity,
  updateRemarksInActivity,
  deleteRemarkFromActivity,
} from "./activity-remarks/handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";

process.env['LAMBDA_NAME'] = 'activitiesHandler';

app.use(expressInputParseMiddleware);

app.get("/company/:companyId/activities", async (req, res) => {
  const resp = await getAllActivitiesByCompany(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/activities", async (req, res) => {
  const resp = await getActivities(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/my-activities", async (req, res) => {
  const resp = await getMyActivities(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/top-activities/:companyId", async (req, res) => {
  const resp = await getTopActivities(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/my-activities-by-status-time", async (req, res) => {
  const resp = await getMyStaleActivityByStatus(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/activities/stale", async (req, res) => {
  const resp = await getEmployeeStaleActivityByStatus(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/activity/:activityId", async (req, res) => {
  const resp = await getActivityById(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/activity", async (req, res) => {
  const resp = await createActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/activity/:activityId", async (req, res) => {
  const resp = await updateActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/activity/:activityId/status/:status", async (req, res) => {
  const resp = await updateStatusOfActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.delete("/activity/:activityId", async (req, res) => {
  const resp = await deleteActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/activity/:activityId/remarks", async (req, res) => {
  const resp = await addRemarksToActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/activity/:activityId/remarks/:remarksId", async (req, res) => {
  const resp = await updateRemarksInActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.delete("/activity/:activityId/remarks/:remarksId", async (req, res) => {
  const resp = await deleteRemarkFromActivity(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/google/calendars", async (req, res) => {
  const resp = await getAllCalendars(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

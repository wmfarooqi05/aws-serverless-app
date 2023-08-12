import express from "express";
import {
  createProfile,
  getEmployees,
  getEmployeesWorkSummary,
  getProfile,
  updateMyProfile,
  uploadOrReplaceAvatar,
} from "./handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");

app.use(expressInputParseMiddleware);

app.get("/employees-summary", async (req, res) => {
  const resp = await getEmployeesWorkSummary(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/employees", async (req, res) => {
  const resp = await getEmployees(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/employee/profile", async (req, res) => {
  const resp = await createProfile(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/employee/profile", async (req, res) => {
  const resp = await getProfile(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/employee/:employeeId/profile", async (req, res) => {
  const resp = await updateMyProfile(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/employee/avatar", async (req, res) => {
  const resp = await uploadOrReplaceAvatar(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

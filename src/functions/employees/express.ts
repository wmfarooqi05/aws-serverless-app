import express from "express";
import {
  getEmployees,
  getEmployeesWorkSummary,
  getProfile,
  updateMyProfile,
} from "./handler";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");

app.use((req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
});

app.get("/employees-summary", async (req, res) => {
  const resp = await getEmployeesWorkSummary(req, {} as any);
  resHelper(res, resp);
});

app.get("/employees", async (req, res) => {
  const resp = await getEmployees(req, {} as any);
  resHelper(res, resp);
});

app.get("/employee/profile", async (req, res) => {
  const resp = await getProfile(req, {} as any);
  resHelper(res, resp);
});

app.put("/employee/profile/:id", async (req, res) => {
  const resp = await updateMyProfile(req, {} as any);
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

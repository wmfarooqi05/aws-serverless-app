import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  addEmployeeToTeam,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  updateTeam,
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

app.get("/team", async (req, res) => {
  const resp = await getTeams(req, {} as any);
  resHelper(res, resp);
});

app.get("/team/:teamId", async (req, res) => {
  const resp = await getTeamById(req, {} as any);
  resHelper(res, resp);
});

app.post("/team", async (req, res) => {
  const resp = await createTeam(req, {} as any);
  resHelper(res, resp);
});

app.put("/team/:teamId", async (req, res) => {
  const resp = await updateTeam(req, {} as any);
  resHelper(res, resp);
});

app.delete("/team/:teamId", async (req, res) => {
  const resp = await deleteTeam(req, {} as any);
  resHelper(res, resp);
});

app.post("/team/:teamId/add-employee/:employeeId", async (req, res) => {
  const resp = await addEmployeeToTeam(req, {} as any);
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

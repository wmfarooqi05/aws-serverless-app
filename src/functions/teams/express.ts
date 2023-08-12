import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  addEmployeeToTeam,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  removeEmployeeFromTeam,
  updateTeam,
} from "./handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";


process.env['LAMBDA_NAME'] = 'teamHandler';

app.use(expressInputParseMiddleware);

app.get("/team", async (req, res) => {
  const resp = await getTeams(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/team/:teamId", async (req, res) => {
  const resp = await getTeamById(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/team", async (req, res) => {
  const resp = await createTeam(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/team/:teamId", async (req, res) => {
  const resp = await updateTeam(req, {} as any);
  expressResponseHelper(res, resp);
});

app.delete("/team/:teamId", async (req, res) => {
  const resp = await deleteTeam(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/team/:teamId/add-employee/:employeeId", async (req, res) => {
  const resp = await addEmployeeToTeam(req, {} as any);
  expressResponseHelper(res, resp);
});

app.delete("/team/:teamId/remove-employee/:employeeId", async (req, res) => {
  const resp = await removeEmployeeFromTeam(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  addEmployeeToTeam,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  googleOauthCallbackHandler,
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,
  oauthHandler,
  removeEmployeeFromTeam,
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

app.post("/google/oauth", async (req, res) => {
  const resp = await oauthHandler(req, {} as any);
  resHelper(res, resp);
});

app.post("/google/oauth/extendToken", async (req, res) => {
  const resp = await googleOauthExtendRefreshToken(req, {} as any);
  resHelper(res, resp);
});

app.post("/google/oauth/googleOauthTokenScope", async (req, res) => {
  const resp = await googleOauthTokenScope(req, {} as any);
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
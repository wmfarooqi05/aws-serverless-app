import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,
  oauthHandler,
} from "./handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";

app.use(expressInputParseMiddleware);

app.post("/google/oauth", async (req, res) => {
  const resp = await oauthHandler(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/google/oauth/extendToken", async (req, res) => {
  const resp = await googleOauthExtendRefreshToken(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/google/oauth/googleOauthTokenScope", async (req, res) => {
  const resp = await googleOauthTokenScope(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

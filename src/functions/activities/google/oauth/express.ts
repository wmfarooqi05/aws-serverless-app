import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  googleOauthCallbackHandler,
  googleOauthExtendRefreshToken,
  googleOauthTokenScope,
  oauthHandlerWithEmployee,
} from "./handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";

app.use(expressInputParseMiddleware);

app.post("/google/oauth", async (req, res) => {
  const resp = await oauthHandlerWithEmployee(req, {} as any);
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

app.get(
  "/google/oauth/callback",
  async (req: express.Request, res: express.Response) => {
    const resp = await googleOauthCallbackHandler(req);
    expressResponseHelper(res, resp);
  }
);

exports.handler = awsSlsExpress({ app });

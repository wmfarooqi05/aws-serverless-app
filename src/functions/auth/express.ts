import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {} from "./handler";
import { expressInputParseMiddleware, expressResponseHelper } from "@utils/express";

app.use(expressInputParseMiddleware);

app.post("/signup", async (req, res) => {
  const resp = await signup(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/login", async (req, res) => {
  const resp = await login(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/forgot-password", async (req, res) => {
  const resp = await login(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/reset-password", async (req, res) => {
  const resp = await login(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

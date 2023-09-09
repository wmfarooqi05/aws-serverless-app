import express from "express";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";
import { getAllJobs } from "./handler";

// import awsSlsExpress from '@vendia/serverless-express';
const app = express();
// import awsSlsExpress from 'aws-serverless-express';
const awsSlsExpress = require("@vendia/serverless-express");

process.env["LAMBDA_NAME"] = "emailsHandler";
app.use(expressInputParseMiddleware);

app.get("/jobs", async (req, res) => {
  const resp = await getAllJobs(req, {} as any);
  expressResponseHelper(res, resp);
});

app.all("*", (req, res) => {
  console.log("event was not caught by any express handler", req);
  expressResponseHelper(res, {
    message: "event was not caught by any express handler",
    statusCode: 200,
  });
});

exports.handler = awsSlsExpress({ app });

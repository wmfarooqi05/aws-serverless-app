import "reflect-metadata";
import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");

import { generateSignedUrl, getPublicUrls } from "./handler";

app.use((req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
});

const resHelper = (res, apiResponse) => {
  res
    .status(apiResponse.statusCode || 200)
    .set(apiResponse.headers)
    .set("Content-Type", "application/json")
    .send(apiResponse.body);
};

app.post("/sqs", async (req, res) => {
  const resp = await sqsHandle(req, {} as any);
  return res.status(200).send(resp?.body || { message: "received" });
});

if (process.env.STAGE === "local") {
  app.post("/sqs-invoke-handler", async (req, res) => {
    const resp = await sqsHandle(req, {} as any);
    return res.status(200).send(resp?.body || { message: "received" });
  });
}

const eventSourceRoutes = {
  AWS_SQS: "/sqs",
};

exports.handler = awsSlsExpress({ app, eventSourceRoutes });

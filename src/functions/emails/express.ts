import express from "express";
import {
  createEmailTemplate,
  getAllTemplates,
  getTemplateById,
} from "./emailTemplates/handler";
import { getEmailTemplateContentById, sendBulkEmails, sendEmail } from "./handler";

// import awsSlsExpress from '@vendia/serverless-express';
const app = express();
// import awsSlsExpress from 'aws-serverless-express';
const awsSlsExpress = require("@vendia/serverless-express");

app.use((req, _, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString();
  } else if (typeof req.body === "string") {
    req.body = JSON.parse(req.body);
  } else {
    req.body = null;
  }
  // Do something with the request, such as logging or modifying headers
  next(); // Call the next middleware or route handler
});

app.get("/emails/templates", async (req, res) => {
  const resp = await getAllTemplates(req, {} as any);
  resHelper(res, resp);
});

app.get("/emails/template/:templateId", async (req, res) => {
  const resp = await getTemplateById(req, {} as any);
  resHelper(res, resp);
});

app.get("/emails/template/:templateId/content", async (req, res) => {
  const resp = await getEmailTemplateContentById(req, {} as any);
  resHelper(res, resp);
});
app.post("/emails/template", async (req, res) => {
  const resp = await createEmailTemplate(req, {} as any);
  resHelper(res, resp);
});
app.post("/emails/send-bulk", async (req, res) => {
  const resp = await sendBulkEmails(req, {} as any);
  resHelper(res, resp);
});

app.post("/send-email", async (req, res) => {
  const resp = await sendEmail(req, {} as any);
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

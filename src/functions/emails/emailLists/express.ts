import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  addEmailList,
  deleteEmailList,
  getAllEmailLists,
  updateEmailList,
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

app.get("/email-list", async (req, res) => {
  const resp = await getAllEmailLists(req, {} as any);
  resHelper(res, resp);
});

app.post("/email-list", async (req, res) => {
  const resp = await addEmailList(req, {} as any);
  resHelper(res, resp);
});

app.put("/email-list/:emailListId", async (req, res) => {
  const resp = await updateEmailList(req, {} as any);
  resHelper(res, resp);
});

app.delete("/email-list/:emailListId", async (req, res) => {
  const resp = await deleteEmailList(req, {} as any);
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

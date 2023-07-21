import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");
import {
  broadcastMessage,
  createNotification,
  getAllConnections,
  getNotificationById,
  getNotifications,
  notificationQueueInvokeHandler,
  updateNotificationsReadStatus,
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

app.get("/notification", async (req, res) => {
  const resp = await getNotifications(req, {} as any);
  resHelper(res, resp);
});

app.post("/notification", async (req, res) => {
  const resp = await createNotification(req, {} as any);
  resHelper(res, resp);
});

app.get("/notification/:id", async (req, res) => {
  const resp = await getNotificationById(req, {} as any);
  resHelper(res, resp);
});

app.put("/notification", async (req, res) => {
  const resp = await updateNotificationsReadStatus(req, {} as any);
  resHelper(res, resp);
});

//// Websockets

app.post("/websocket/broadcast", async (req, res) => {
  const resp = await broadcastMessage(req, {} as any);
  resHelper(res, resp);
});

app.post("/get-connections", async (req, res) => {
  const resp = await getAllConnections(req, {} as any);
  resHelper(res, resp);
});

//// LOCAL

if (process.env.STAGE === "local") {
  console.log("app using local notification queue");
  app.post("/notification-queue", async (req, res) => {
    const resp = await notificationQueueInvokeHandler(req);
    return res.status(200).send(resp?.body || { message: "received" });
  });
}

const eventSourceRoutes = {
  AWS_SQS: "/sqs",
};

exports.handler = awsSlsExpress({ app, eventSourceRoutes });

const resHelper = (res, apiResponse) => {
  res
    .status(apiResponse.statusCode || 200)
    .set(apiResponse.headers)
    .set("Content-Type", "application/json")
    .send(apiResponse.body);
};

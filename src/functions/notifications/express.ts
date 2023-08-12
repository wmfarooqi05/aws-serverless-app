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
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";

app.use(expressInputParseMiddleware);

app.get("/notification", async (req, res) => {
  const resp = await getNotifications(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/notification", async (req, res) => {
  const resp = await createNotification(req, {} as any);
  expressResponseHelper(res, resp);
});

app.get("/notification/:id", async (req, res) => {
  const resp = await getNotificationById(req, {} as any);
  expressResponseHelper(res, resp);
});

app.put("/notification", async (req, res) => {
  const resp = await updateNotificationsReadStatus(req, {} as any);
  expressResponseHelper(res, resp);
});

//// Websockets

app.post("/websocket/broadcast", async (req, res) => {
  const resp = await broadcastMessage(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/get-connections", async (req, res) => {
  const resp = await getAllConnections(req, {} as any);
  expressResponseHelper(res, resp);
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

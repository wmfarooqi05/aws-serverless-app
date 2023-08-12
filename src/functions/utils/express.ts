import "reflect-metadata";
import express from "express";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");

import { generateSignedUrl, getPublicUrls } from "./handler";
import {
  expressInputParseMiddleware,
  expressResponseHelper,
} from "@utils/express";


process.env['LAMBDA_NAME'] = 'utilsHandler';
app.use(expressInputParseMiddleware);

app.post("/generate-signed-url", async (req, res) => {
  const resp = await generateSignedUrl(req, {} as any);
  expressResponseHelper(res, resp);
});

app.post("/get-public-urls", async (req, res) => {
  const resp = await getPublicUrls(req, {} as any);
  expressResponseHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

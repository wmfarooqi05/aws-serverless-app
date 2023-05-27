import "reflect-metadata";
import { formatJSONResponse } from "@libs/api-gateway";
import { randomUUID } from "crypto";
import express from "express";
import { parse as parseMultiPart } from "lambda-multipart-parser";
import fs from "fs";

const app = express();
const awsSlsExpress = require("@vendia/serverless-express");

import { generateSignedUrl } from "./handler";

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

// Multer configuration for S3 storage
// const upload = multer({
//   storage: multerS3({
//     s3: s3Client,
//     bucket: process.env.DEPLOYMENT_BUCKET,
//     acl: "public-read",
//     key: (_, file, cb) => {
//       console.log("cb multer");
//       const fileExtension = path.extname(file.originalname);
//       const s3path = "tmp/";
//       const fileName = `${s3path}/${randomUUID()}${fileExtension}`;
//       cb(null, fileName);
//     },
//   }),
// });

// const upload = multer({
//   storage: multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, "uploads");
//     },
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + "-" + Date.now());
//     },
//   }),
// });
// app.post("/upload", async (req, res) => {
//   const uploadedFile = req.file;
//   if (!uploadedFile) {
//     return res.status(400).json({ error: "No file provided" });
//   }

//   // File uploaded successfully
//   const fileUrl = uploadedFile.path;
//   res.json({ url: fileUrl });
// });

// export const _handler = async (event) => {
//   // console.log("fileName", event.body);
//   const startedTime = Date.now();
//   const parsedData = await parseMultiPart(event);

//   const uploadedFilePath = `/tmp/${parsedData.filename}`;
//   await saveFile(parsedData.file, uploadedFilePath);

//   const savedToLocalTime = Date.now();

//   // Check if the entire object has been uploaded
//   const isObjectUploaded = checkIfObjectUploaded(parsedData);

//   const map: { originalName: string; newName: string }[] = [];
//   const fsPromises = parsedData.files.map((x) => {
//     const newName = `${randomUUID()}.${x.contentType.split("/")[1]}`;
//     map.push({
//       originalName: x.filename,
//       newName,
//     });
//     return saveFile(`/tmp/${newName}`, x.content);
//     // return uploadContentToS3(newName, x.content, "public-read");
//   });
//   const fsResp = await Promise.all(fsPromises);

//   const uploadedTime = Date.now();

//   return formatJSONResponse(
//     {
//       uploadedTime: uploadedTime - savedToLocalTime,
//       savedToLocalTime: savedToLocalTime - startedTime,
//       result,
//     },
//     200
//   );
//   // return {
//   //   fileName,
//   //   ...s3Resp,
//   // };
// };

const saveFile = async (filePath: string, file: Buffer) => {
  return fs.promises.writeFile(filePath, file);
};

app.post("/generate-signed-url", async (req, res) => {
  const resp = await generateSignedUrl(req, {} as any);
  resHelper(res, resp);
});

exports.handler = awsSlsExpress({ app });

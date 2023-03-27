import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import fs from "fs";

const s3 = new S3Client({
  region: process.env.REGION,
});

export const uploadToS3 = async (path, body) => {
  const Key = `${path}/IMPORT_JOB_${randomUUID()}_error_report.text`;
  const uploadParams = {
    Bucket: process.env.DEPLOYMENT_BUCKET,
    Key,
    Body: JSON.stringify(body),
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    return `${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${Key}`;
  } catch (e) {
    console.error("Error uploading file:", e);
  }
};

// make a download function and write file to some folder

export const downloadFromS3Readable = async (keyName): Promise<Readable> => {
  const params = {
    Bucket: process.env.DEPLOYMENT_BUCKET,
    Key: keyName,
  };
  const getObjectCommand = new GetObjectCommand(params);
  const response = await s3.send(getObjectCommand);

  return Readable.from(response.Body as Readable);
};

// const dir = path.resolve(path.join(__dirname, "errors"));
// if (!fs.existsSync(dir)) {
//   fs.mkdirSync(dir);
// }

// await fs.writeFileSync(
//   path.join(dir, `IMPORT_JOB_${randomUUID()}_error_report.text`),
//   JSON.stringify(body)
// );
// Body: fs.createReadStream('/Employees/waleedfarooqi/projects/qasid/staffing-api/src/functions/companies/temperror.txt'),

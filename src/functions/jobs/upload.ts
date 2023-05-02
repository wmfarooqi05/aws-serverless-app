import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import * as stream from "stream";
import * as fs from "fs";
import * as XLSX from "xlsx";
import snakeCase from "lodash.snakecase";

const s3 = new S3Client({
  region: process.env.REGION,
});

/**
 * @deprecated
 * @param path
 * @param body
 * @returns
 */
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

/**
 *
 * @param filePath
 * @param Key S3 file key (folder_path/filename)
 * @returns
 */
export const uploadFileToS3 = async (filePath: string, Key: string) => {
  const fileContent = await fs.promises.readFile(filePath);
  return uploadContentToS3(Key, fileContent);
};

export const uploadContentToS3 = async (
  Key: string,
  fileContent: any
): Promise<{ fileUrl: string; fileKey: string }> => {
  const uploadParams: PutObjectCommandInput = {
    Bucket: process.env.DEPLOYMENT_BUCKET,
    Key,
    Body: fileContent,
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    return {
      fileUrl: `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${Key}`,
      fileKey: Key,
    };
  } catch (e) {
    console.error("Error uploading file:", e);
  }
};

export const uploadJsonAsXlsx = async (
  Key: string,
  content: any
): Promise<{ fileUrl: string; fileKey: string }> => {
  const rows = [];
  const headers = Object.keys(content[0]);
  rows.push(headers.map((x) => snakeCase(x)));
  for (const item of content) {
    const row = headers.map((header) => item[header]); // Map the item's values based on the headers
    rows.push(row);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  const buffer = XLSX.write(workbook, { type: "buffer" });
  return uploadContentToS3(Key, buffer);
};

// make a download function and write file to some folder

export const downloadFromS3Readable = async (keyName): Promise<Buffer> => {
  const params = {
    Bucket: process.env.DEPLOYMENT_BUCKET,
    Key: keyName,
  };
  console.log("[downloadFromS3Readable] params", params);
  const getObjectCommand = new GetObjectCommand(params);
  const objectData = await s3.send(getObjectCommand);

  // Pipe the response to a writable stream and collect it as a Buffer
  const bufferStream = new stream.PassThrough();
  objectData.Body.pipe(bufferStream);

  // Accumulate the data in a buffer
  const chunks = [];
  bufferStream.on("readable", () => {
    let chunk;
    while ((chunk = bufferStream.read()) !== null) {
      chunks.push(chunk);
    }
  });

  await stream.promises.finished(bufferStream);

  return Buffer.concat(chunks);
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
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    // Use the fs.stat method to check if the file exists
    await fs.promises.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      // If the error code is ENOENT, the file does not exist
      return false;
    }
    // If the error code is something else, rethrow the error
    throw error;
  }
};

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
  CopyObjectCommandInput,
  CopyObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommandOutput,
  GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import * as stream from "stream";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { snakeCase } from "lodash";
import { Readable } from "stream";

// @TODO rename this to s3-utils

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
export const uploadFileToS3 = async (
  filePath: string,
  Key: string,
  ACL: string = null
) => {
  const fileContent = await fs.promises.readFile(filePath);
  return uploadContentToS3(Key, fileContent, ACL);
};

export const uploadContentToS3 = async (
  Key: string,
  fileContent: any,
  ACL: string = null
): Promise<{ fileUrl: string; fileKey: string }> => {
  const uploadParams: PutObjectCommandInput = {
    Bucket: process.env.DEPLOYMENT_BUCKET,
    Key,
    Body: fileContent,
  };
  if (ACL) {
    uploadParams.ACL = ACL;
  }

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
  content: any,
  ACL: string = null
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
  return uploadContentToS3(Key, buffer, ACL);
};

/**
 *
 * @param sourceKey
 * @param destinationKey
 * @param ACL
 * @param deleteOriginal
 * @param sourceBucket
 * @param sourceRegion
 * @param destinationBucket
 * @param destinationRegion
 * @returns
 */
export const copyS3Object = async (
  sourceKey: string,
  destinationKey: string,
  ACL: string = null,
  deleteOriginal: boolean = false,
  sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
  sourceRegion: string = process.env.REGION,
  destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
  destinationRegion: string = process.env.REGION
): Promise<CopyObjectCommandOutput> => {
  const copyParams: CopyObjectCommandInput = {
    Bucket: destinationBucket,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: destinationKey,
  };

  if (ACL) {
    copyParams.ACL = ACL;
  }

  try {
    let sourceClient = s3;
    let destinationClient = s3;
    if (sourceRegion !== process.env.REGION) {
      sourceClient = new S3Client({ region: sourceRegion });
    }
    if (destinationRegion !== process.env.REGION) {
      destinationClient = new S3Client({ region: destinationRegion });
    }

    const newLoc = await destinationClient.send(
      new CopyObjectCommand(copyParams)
    );

    // Delete the object from the old location
    if (deleteOriginal) {
      const deleteParams = {
        Bucket: sourceBucket,
        Key: sourceKey,
      };
      await s3.send(new DeleteObjectCommand(deleteParams));
    }
    return newLoc;
  } catch (e) {}
};
// make a download function and write file to some folder

export const getKeysFromS3Url = (
  url: string
): { region: string; bucketName: string; fileKey: string } => {
  const parsedUrl = new URL(url);
  // Extract the S3 bucket name and object key from the URL
  const bucketName = parsedUrl.hostname.split(".")[0];
  const fileKey = parsedUrl.pathname.substring(1);

  // Extract the region from the URL
  const region = parsedUrl.hostname.split(".")[2];

  return { region, bucketName, fileKey };
};

export const getS3BufferFromUrl = async (url: string): Promise<Buffer> => {
  const keys = getKeysFromS3Url(url);
  return getS3BufferFromKey(keys.fileKey, keys.bucketName);
};

export const getS3BufferFromKey = async (
  fileKey: string,
  bucketName: string = process.env.DEPLOYMENT_BUCKET
): Promise<Buffer> => {
  const params: GetObjectCommandInput = {
    Bucket: bucketName,
    Key: fileKey,
  };
  console.log("[getS3BufferFromKey] params", params);
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

export const getS3ReadableFromUrl = async (url: string): Promise<Buffer> => {
  const keys = getKeysFromS3Url(url);
  return getS3ReadableFromKey(keys.fileKey, keys.bucketName);
};

export const getS3ReadableFromKey = async (
  fileKey: string,
  bucketName: string = process.env.DEPLOYMENT_BUCKET
): Promise<Buffer> => {
  const params: GetObjectCommandInput = {
    Bucket: bucketName,
    Key: fileKey,
  };
  console.log("[getS3BufferFromKey] params", params);
  const getObjectCommand = new GetObjectCommand(params);
  const objectData = await s3.send(getObjectCommand);

  return objectData.Body as Readable;
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

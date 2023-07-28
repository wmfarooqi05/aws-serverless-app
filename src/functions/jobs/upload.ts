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
  DeleteObjectCommandOutput,
  ListObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import * as stream from "stream";
import * as fs from "fs";
import { Readable } from "stream";
import { CustomError } from "@helpers/custom-error";
import bytes from "@utils/bytes";
import { createFileWithDirectories } from "@utils/fs";

// @TODO rename this to s3-utils

const s3Client = new S3Client({
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
    await s3Client.send(command);
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
  /** @deprecated ACL will always be private */
  ACL: string = null
) => {
  const fileContent = await fs.promises.readFile(filePath);
  return uploadContentToS3(Key, fileContent);
};

export const uploadContentToS3 = async (
  Key: string,
  fileContent: any,
  /** @deprecated */
  ACL: string = "private"
): Promise<{ fileUrl: string; fileKey: string }> => {
  if (process.env.STAGE === "local") {
    const fullPath = `${process.env.ROOT_FOLDER_PATH}/S3TmpBucket/${Key}`;
    await createFileWithDirectories(fullPath, fileContent);
    return { fileUrl: fullPath, fileKey: Key };
  }
  const uploadParams: PutObjectCommandInput = {
    Bucket: process.env.DEPLOYMENT_BUCKET,
    Key,
    Body: fileContent,
  };
  // if (ACL) {
  // ACL will always be private
  // uploadParams.ACL = ACL;
  // }

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    return {
      fileUrl: `https://${process.env.DEPLOYMENT_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${Key}`,
      fileKey: Key,
    };
  } catch (e) {
    console.error("Error uploading file:", e);
  }
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

  // always private
  // if (ACL) {
  //   copyParams.ACL = ACL;
  // }

  try {
    const { sourceClient, destinationClient } = getS3ClientsForRegions(
      sourceRegion,
      destinationRegion
    );

    const newLoc = await destinationClient.send(
      new CopyObjectCommand(copyParams)
    );

    // Delete the object from the old location
    if (deleteOriginal) {
      const deleteParams = {
        Bucket: sourceBucket,
        Key: sourceKey,
      };
      await sourceClient.send(new DeleteObjectCommand(deleteParams));
    }
    return newLoc;
  } catch (e) {}
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
export const copyS3ObjectAndGetSize = async (
  sourceKey: string,
  destinationKey: string,
  deleteOriginal: boolean = false,
  sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
  sourceRegion: string = process.env.REGION,
  destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
  destinationRegion: string = process.env.REGION
): Promise<{ newLoc: CopyObjectCommandOutput; size: string }> => {
  const copyParams: CopyObjectCommandInput = {
    Bucket: destinationBucket,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: destinationKey,
  };

  // always private
  // if (ACL) {
  //   copyParams.ACL = ACL;
  // }

  try {
    const { sourceClient, destinationClient } = getS3ClientsForRegions(
      sourceRegion,
      destinationRegion
    );

    const newLoc = await destinationClient.send(
      new CopyObjectCommand(copyParams)
    );

    const head = await destinationClient.send(
      new HeadObjectCommand({
        Bucket: destinationBucket,
        Key: destinationKey,
      })
    );

    // Delete the object from the old location
    if (deleteOriginal) {
      const deleteParams = {
        Bucket: sourceBucket,
        Key: sourceKey,
      };
      await sourceClient.send(new DeleteObjectCommand(deleteParams));
    }
    return { newLoc, size: bytes(head.ContentLength).toString() };
  } catch (e) {}
};

/**
 *
 * @param sourceFolder
 * @param destinationFolder
 * @deprecated @param ACL
 * @param deleteOriginal
 * @param sourceBucket
 * @param sourceRegion
 * @param destinationBucket
 * @param destinationRegion
 */
export const copyS3FolderContent = async (
  sourceFolder: string,
  destinationFolder: string,
  /** @deprecated ACL will always be private */
  ACL: string = "private",
  deleteOriginal: boolean = false,
  sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
  sourceRegion: string = process.env.REGION,
  destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
  destinationRegion: string = process.env.REGION
): Promise<void> => {
  const { sourceClient, destinationClient } = getS3ClientsForRegions(
    sourceRegion,
    destinationRegion
  );
  const listObjectsCommand = new ListObjectsCommand({
    Bucket: sourceBucket,
    Prefix: sourceFolder,
  });

  const listObjectsResponse = await sourceClient.send(listObjectsCommand);
  const objects = listObjectsResponse.Contents;
  for (const object of objects) {
    const copyObjectCommand = {
      CopySource: `${sourceBucket}/${object.Key}`,
      Bucket: destinationBucket,
      Key: `${destinationFolder}/${object.Key.substring(
        sourceFolder.length + 1
      )}`,
      // ACL,
    };
    await destinationClient.send(new CopyObjectCommand(copyObjectCommand));

    if (deleteOriginal) {
      const deleteObjectCommand = {
        Bucket: sourceBucket,
        Key: object.Key,
      };
      await sourceClient.send(new DeleteObjectCommand(deleteObjectCommand));
    }
  }
};
export const deleteObjectFromS3Url = (
  url: string
): Promise<DeleteObjectCommandOutput> => {
  const keys = getKeysFromS3Url(url);
  return deleteObjectFromS3Key(keys.fileKey, keys.bucketName);
};

export const deleteObjectFromS3Key = async (
  key: string,
  bucket: string = process.env.DEPLOYMENT_BUCKET
): Promise<DeleteObjectCommandOutput> => {
  const deleteParams = {
    Bucket: bucket,
    Key: key,
  };
  return s3Client.send(new DeleteObjectCommand(deleteParams));
};

// make a download function and write file to some folder

export const getKeysFromS3Url = (
  url: string
): { region: string; bucketName: string; fileKey: string } => {
  let region = process.env.REGION;
  let bucketName = process.env.DEPLOYMENT_BUCKET;
  let fileKey = "";
  if (url.includes(process.env.DEPLOYMENT_BUCKET)) {
    const parsedUrl = new URL(url);
    // Extract the S3 bucket name and object key from the URL
    bucketName = parsedUrl.hostname.split(".")[0];
    fileKey = parsedUrl.pathname.substring(1);

    // Extract the region from the URL
    region = parsedUrl.hostname.split(".")[2];

    return { region, bucketName, fileKey };
  } else if (url.includes(process.env.CLOUD_FRONT_URL)) {
    return {
      region,
      bucketName,
      fileKey: url.replace(`${process.env.CLOUD_FRONT_URL}/`, ""),
    };
  }
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
  console.log("[getS3BufferFromKey] params", fileKey, bucketName);
  const getObjectCommand = new GetObjectCommand(params);
  const objectData = await s3Client.send(getObjectCommand);

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

export const getS3ReadableFromUrl = async (url: string) => {
  const keys = getKeysFromS3Url(url);
  return getS3ReadableFromKey(keys.fileKey, keys.bucketName);
};

export const getS3ReadableFromKey = async (
  fileKey: string,
  bucketName: string = process.env.DEPLOYMENT_BUCKET
) => {
  const params: GetObjectCommandInput = {
    Bucket: bucketName,
    Key: fileKey,
  };
  console.log("[getS3BufferFromKey] params", params);
  const getObjectCommand = new GetObjectCommand(params);
  const objectData = await s3Client.send(getObjectCommand);

  return objectData.Body;
};

export const getS3ClientsForRegions = (
  sourceRegion: string,
  destinationRegion: string
): { sourceClient: S3Client; destinationClient: S3Client } => {
  let sourceClient = s3Client;
  let destinationClient = s3Client;
  if (sourceRegion !== process.env.REGION) {
    sourceClient = new S3Client({ region: sourceRegion });
  }
  if (destinationRegion !== process.env.REGION) {
    destinationClient = new S3Client({ region: destinationRegion });
  }
  return { sourceClient, destinationClient };
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

export const validateS3BucketUrl = (url: string) => {
  const keys = getKeysFromS3Url(url);
  if (
    !(
      keys?.bucketName === process.env.DEPLOYMENT_BUCKET &&
      keys?.region === process.env.REGION
    )
  ) {
    throw new CustomError(
      `This url is not valid S3 url of our bucket, ${url}`,
      400
    );
  }
};

import { CustomError } from "@helpers/custom-error";
import { VARIATION_STATUS } from "@models/FileRecords";

/**
 *
 * @param bucketName
 * @param region
 * @param fileKey
 * @param fileName in case fileKey doesn't have fileName
 * @returns
 */
export const constructS3Url = (
  bucketName: string,
  region: string,
  fileKey: string,
  fileName?: string
) => {
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
  return fileName ? `${url}/${fileName}` : url;
};

export const checkVariationStatus = (
  fileType: string | null | undefined
): VARIATION_STATUS => {
  if (fileType?.split("/")?.[0] === "image") {
    return "REQUIRED";
  } else {
    return "NOT_REQUIRED";
  }
};

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

export const validateS3BucketUrl = (url: string) => {
  const keys = getKeysFromS3Url(url);
  if (
    !(
      keys.bucketName === process.env.DEPLOYMENT_BUCKET &&
      keys.region === process.env.REGION
    )
  ) {
    throw new CustomError(
      `This url is not valid S3 url of our bucket, ${url}`,
      400
    );
  }
};

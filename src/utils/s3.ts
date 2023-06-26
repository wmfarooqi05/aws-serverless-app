import { THUMBNAIL_STATUS } from "@models/FilePermissions";

export const constructS3Url = (
  bucketName: string,
  region: string,
  fileKey: string
) => `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;

export const checkThumbnailStatus = (
  fileType: string | null | undefined
): THUMBNAIL_STATUS => {
  if (fileType?.split("/")?.[0] === "image") {
    return "REQUIRED";
  } else {
    return "NOT_SUPPORTED";
  }
};

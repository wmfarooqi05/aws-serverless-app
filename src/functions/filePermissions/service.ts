import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { copyS3Object, copyS3ObjectAndGetSize } from "@functions/jobs/upload";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  FilePermissionModel,
  FilePermissionsMap,
  IFilePermissions,
  PermissionsMap,
} from "@models/FilePermissions";
import bytes from "@utils/bytes";
import { checkThumbnailStatus, constructS3Url } from "@utils/s3";
import { inject, injectable } from "tsyringe";

@injectable()
export class FilePermissionsService {
  s3Client: S3Client = null;
  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {
    this.s3Client = new S3Client({ region: process.env.REGION });
  }

  async uploadFilesToBucketWithPermissions(
    files: {
      originalFilename: string;
      contentType: string;
      Key: string;
      fileContent: any;
    }[],
    permissionMap: PermissionsMap,
    bucketName: string = process.env.DEPLOYMENT_BUCKET,
    region: string = process.env.REGION
  ): Promise<IFilePermissions[]> {
    const filePromises = files.map(({ Key, fileContent }) => {
      const uploadParams: PutObjectCommandInput = {
        Bucket: process.env.DEPLOYMENT_BUCKET,
        Key,
        Body: JSON.stringify(fileContent),
      };

      const command = new PutObjectCommand(uploadParams);
      return this.s3Client.send(command);
    });
    const responses = await Promise.allSettled(filePromises);
    const dbEntries: IFilePermissions[] = responses.map((x, index) => {
      const { Key, fileContent, contentType, originalFilename } = files[index];
      return {
        bucketName,
        region,
        fileKey: Key,
        fileUrl: constructS3Url(bucketName, region, Key),
        contentType,
        originalFilename,
        permissions: permissionMap,
        thumbnailStatus: checkThumbnailStatus(contentType),
        uploadStatus: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        error: x.status === "rejected" ? x.reason : null,
        fileSize: bytes(JSON.stringify(fileContent))?.toString() || "",
      } as IFilePermissions;
    });

    const dbResp: IFilePermissions[] = await FilePermissionModel.query().insert(
      dbEntries
    );
    return dbResp;
  }

  async copyFilesToBucketWithPermissions(
    files: {
      originalFilename: string;
      contentType: string;
      sourceKey: string;
      destinationKey: string;
      deleteOriginal?: boolean;
      sourceBucket: string;
      sourceRegion: string;
    }[],
    permissionMap: FilePermissionsMap,
    destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
    destinationRegion: string = process.env.REGION
  ): Promise<IFilePermissions[]> {
    const filePromises = files.map((x) =>
      copyS3ObjectAndGetSize(
        x.sourceKey,
        x.destinationKey,
        x.deleteOriginal,
        x.sourceBucket,
        x.sourceRegion,
        destinationBucket,
        destinationRegion
      )
    );

    const responses = await Promise.allSettled(filePromises);
    const dbEntries: IFilePermissions[] = responses.map((x, index) => {
      const { destinationKey, contentType, originalFilename } = files[index];
      return {
        bucketName: destinationBucket,
        region: destinationRegion,
        fileKey: destinationKey,
        fileUrl: constructS3Url(
          destinationBucket,
          destinationRegion,
          destinationKey
        ),
        contentType,
        originalFilename,
        permissions: permissionMap,
        thumbnailStatus: checkThumbnailStatus(contentType),
        uploadStatus: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        error: x.status === "rejected" ? x.reason : null,
        fileSize: x.status === "fulfilled" ? x.value.size : 0,
      };
    });

    const dbResp: IFilePermissions[] = await FilePermissionModel.query().insert(
      dbEntries
    );
    return dbResp;
  }
}

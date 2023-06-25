import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  FilePermissionModel,
  FilePermissions,
  IFilePermissions,
  PermissionsMap,
} from "@models/FilePermissions";
import bytes from "@utils/bytes";
import { checkThumbnailStatus, constructS3Url } from "@utils/s3";
import { inject, injectable } from "tsyringe";

@injectable()
export class CompanyService {
  s3Client: S3Client = null;
  constructor(
    @inject(DatabaseService) private readonly _: DatabaseService
  ) {
    this.s3Client = new S3Client({ region: process.env.REGION });
  }

  async uploadFilesToBucketWithPermissions(
    bucketName: string,
    region: string,
    files: {
      Key: string;
      fileContent: any;
      fileType: string;
      originalName: string;
    }[],
    permissionMap: PermissionsMap
  ): Promise<IFilePermissions[]> {
    const filePromises = files.map(({ Key, fileContent }) => {
      const uploadParams: PutObjectCommandInput = {
        Bucket: process.env.DEPLOYMENT_BUCKET,
        Key,
        Body: fileContent,
      };

      const command = new PutObjectCommand(uploadParams);
      return this.s3Client.send(command);
    });
    const responses = await Promise.allSettled(filePromises);
    const dbEntries: IFilePermissions[] = responses.map((x, index) => {
      const { Key, fileContent, fileType, originalName } = files[index];
      return {
        bucketName,
        region,
        fileKey: Key,
        fileUrl: constructS3Url(bucketName, region, Key),
        fileSize: bytes(fileContent).toString(),
        fileType,
        originalName,
        permissions: permissionMap,
        thumbnailStatus: checkThumbnailStatus(fileType),
        uploadStatus: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        error: x.status === "rejected" && x.reason,
      };
    });

    const dbResp: IFilePermissions[] = await FilePermissionModel.query().insert(
      dbEntries
    );
    return dbResp;
  }
}

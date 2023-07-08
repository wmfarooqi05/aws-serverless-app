import {
  GetObjectAclCommand,
  GetObjectAclCommandInput,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  copyS3Object,
  copyS3ObjectAndGetSize,
  getKeysFromS3Url,
} from "@functions/jobs/upload";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  FilePermissionModel,
  FilePermissionsMap,
  IFilePermissions,
} from "@models/FilePermissions";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import bytes from "@utils/bytes";
import { checkThumbnailStatus, constructS3Url } from "@utils/s3";
import { inject, injectable } from "tsyringe";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { SecretManager } from "@common/service/SecretManager";
import { CustomError } from "@helpers/custom-error";
import moment from "moment-timezone";

@injectable()
export class FilePermissionsService {
  s3Client: S3Client = null;
  cloudFrontClient: CloudFrontClient = null;
  cloudFrontPrivateKeyInitializing = false;

  constructor(
    @inject(DatabaseService) private readonly _: DatabaseService,
    @inject(SecretManager) private readonly secretManager: SecretManager
  ) {
    this.s3Client = new S3Client({ region: process.env.REGION });
    this.cloudFrontClient = new CloudFrontClient({
      region: process.env.REGION,
    });
  }

  async initializeCloudFrontPrivateKey() {
    if (
      !process.env.CLOUDFRONT_PRIVATE_KEY &&
      !this.cloudFrontPrivateKeyInitializing
    ) {
      this.cloudFrontPrivateKeyInitializing = true;
      const privateKey = await this.secretManager.getValueFromSecretManager(
        "cloudfront/dev/signing-private-key"
      );
      process.env.CLOUDFRONT_PRIVATE_KEY = Buffer.from(
        privateKey,
        "base64"
      ).toString("utf8");
      this.cloudFrontPrivateKeyInitializing = false;
    }
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

    const dbResp: IFilePermissions[] = await FilePermissionModel.query()
      .insert(dbEntries)
      .onConflict()
      .ignore();
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

  async downloadFileFromS3WithPermissions(
    employee: IEmployeeJwt,
    fileUrls: string[]
  ): Promise<IFilePermissions[]> {
    const filePermissionRecords: IFilePermissions[] =
      await FilePermissionModel.query().whereIn("fileUrl", fileUrls);

    await this.initializeCloudFrontPrivateKey();
    return filePermissionRecords
      .filter((x) => x.permissions[employee.sub])
      .map((x) => ({
        ...x,
        fileUrl: this.getCloudFrontSignedUrl(
          x.fileUrl,
          process.env.CLOUDFRONT_PRIVATE_KEY
        ),
        thumbnailUrl: this.getCloudFrontSignedUrl(
          x.thumbnailUrl,
          process.env.CLOUDFRONT_PRIVATE_KEY
        ),
      }));
  }

  getCloudFrontSignedUrl(
    url: string,
    privateKey: string,
    dateLessThan = moment().add(7, "days").utc().format()
  ): string {
    const { fileKey } = getKeysFromS3Url(url);
    if (!fileKey) {
      throw new CustomError(`No valid s3 key in ${url}`, 400);
    }
    const cdnUrl = `${process.env.CLOUD_FRONT_DOMAIN_NAME}/${fileKey}`;
    const keyPairId = process.env.CLOUD_FRONT_PUBLIC_KEY_ID;

    return getSignedUrl({
      url: cdnUrl,
      keyPairId,
      dateLessThan, //moment().add(7, "days").utc().format(),
      privateKey,
    });
  }
}

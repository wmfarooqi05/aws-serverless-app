import {
  GetObjectAclCommand,
  GetObjectAclCommandInput,
  GetObjectCommand,
  HeadObjectCommand,
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
  FileRecordModel,
  FilePermissionsMap,
  IFileRecords,
} from "@models/FileRecords";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import bytes from "@utils/bytes";
import { checkVariationStatus, constructS3Url } from "@utils/s3";
import { inject, injectable } from "tsyringe";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { SecretManager } from "@common/service/SecretManager";
import { CustomError } from "@helpers/custom-error";
import moment from "moment-timezone";
import JobsModel, { IJobData } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import { getFileContentType, getFileExtension, getFileNameWithoutExtension } from "@utils/file";

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
      fileType: string;
      s3Key: string;
      fileContent: any;
      fileName: string;
    }[],
    permissionMap: FilePermissionsMap,
    bucketName: string = process.env.DEPLOYMENT_BUCKET,
    region: string = process.env.REGION
  ): Promise<IFileRecords[]> {
    const filePromises = files.map(({ s3Key, fileContent, fileName }) => {
      const uploadParams: PutObjectCommandInput = {
        Bucket: process.env.DEPLOYMENT_BUCKET,
        Key: `${s3Key}/${fileName}`,
        Body: JSON.stringify(fileContent),
      };

      const command = new PutObjectCommand(uploadParams);
      return this.s3Client.send(command);
    });
    const responses = await Promise.allSettled(filePromises);
    const dbEntries: IFileRecords[] = responses.map((x, index) => {
      const { s3Key, fileName, fileContent, fileType, originalFilename } =
        files[index];
      return {
        fileName,
        s3Key,
        fileSize: bytes(JSON.stringify(fileContent))?.toString() || "",
        fileUrl: constructS3Url(bucketName, region, s3Key),
        bucketName,
        region,
        fileType,
        originalFilename,
        permissions: permissionMap,
        status: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        details: x.status === "rejected" ? { error: x.reason } : {},
      } as IFileRecords;
    });

    const dbResp: IFileRecords[] = await FileRecordModel.query()
      .insert(dbEntries)
      .onConflict()
      .ignore();
    await this.prepareImageVariationJob(dbResp);

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
  ): Promise<IFileRecords[]> {
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
    const dbEntries: IFileRecords[] = responses.map((x, index) => {
      const { destinationKey, contentType, originalFilename } = files[index];
      const fileNameWithExt = destinationKey.split("/").at(-1);
      return {
        bucketName: destinationBucket,
        region: destinationRegion,
        fileName: getFileNameWithoutExtension(fileNameWithExt),
        s3Key: destinationKey.replace(fileNameWithExt, ""),
        fileUrl: constructS3Url(
          destinationBucket,
          destinationRegion,
          destinationKey
        ),
        fileType: contentType,
        originalFilename,
        permissions: permissionMap,
        status: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        fileSize: x.status === "fulfilled" ? x.value.size : 0,
        details: x.status === "rejected" ? { error: x.reason } : {},
      } as IFileRecords;
    });

    const dbResp: IFileRecords[] = await FileRecordModel.query().insert(
      dbEntries
    );
    await this.prepareImageVariationJob(dbResp);

    return dbResp;
  }

  async prepareImageVariationJob(entries: IFileRecords[]) {
    // We are not handling it for now;
    return [];
    // this is working code of job which has to be created
    const variationRequired = entries.filter(
      (x) => x.variationStatus === "REQUIRED"
    );

    if (variationRequired.length) {
      // change job to newer job system
      const jobItem = new JobsModel({
        jobId: randomUUID(),
        uploadedBy: "SYSTEM",
        jobType: "CREATE_MEDIA_FILE_VARIATIONS",
        details: { files: variationRequired.map((x) => x.id) },
        jobStatus: "PENDING",
      });

      await jobItem.save();
    }
  }

  async getCDNPublicUrlWithPermissions(
    employee: IEmployeeJwt,
    fileUrls: string[]
  ): Promise<IFileRecords[]> {
    const fileRecordRecords: IFileRecords[] =
      await FileRecordModel.query().whereIn("fileUrl", fileUrls);

    await this.initializeCloudFrontPrivateKey();
    return fileRecordRecords
      .filter((x) => x.permissions[employee.sub])
      .map((x) => ({
        ...x,
        fileUrl: this.getCloudFrontSignedUrl(
          x.fileUrl,
          process.env.CLOUDFRONT_PRIVATE_KEY
        ),
        variations:
          x.variations?.map((v) => ({
            ...v,
            fileUrl: this.getCloudFrontSignedUrl(
              v.fileUrl,
              process.env.CLOUDFRONT_PRIVATE_KEY
            ),
          })) || [],
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

  async getFileProperties(
    objectKey: string,
    bucketName: string = process.env.DEPLOYMENT_BUCKET,
    region: string = process.env.AWS_REGION
  ) {
    const client = this.getS3Clients(region);
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    try {
      const response = await client.send(command);
      const { ContentType, ContentLength } = response;

      return {
        contentType: ContentType,
        contentLength: ContentLength,
        size: bytes(ContentLength),
      };
    } catch (error) {
      console.error("Error retrieving file properties:", error);
    }
  }

  getS3Clients(region: string = process.env.AWS_REGION): S3Client {
    if (region === process.env.AWS_REGION) {
      return this.s3Client;
    } else {
      return new S3Client({ region });
    }
  }
}

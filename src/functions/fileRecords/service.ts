import {
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  copyS3ObjectAndGetSize,
  getKeysFromS3Url,
} from "@functions/jobs/upload";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  FileRecordModel,
  FilePermissionsMap,
  IFileRecords,
  VARIATION_STATUS,
  IFileRecordDetails,
  FILE_VARIATION_TYPE,
  ReadAllPermissions,
} from "@models/FileRecords";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import bytes, { getByteSize } from "@utils/bytes";
import { checkVariationStatus, constructS3Url } from "@utils/s3";
import { inject, injectable } from "tsyringe";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { SecretManager } from "@common/service/SecretManager";
import { CustomError } from "@helpers/custom-error";
import moment from "moment-timezone";
import {
  getFileContentType,
  getFileExtension,
  getFileNameWithoutExtension,
} from "@utils/file";
import JobsModel, { IJob } from "@models/Jobs";
import { SQSClient } from "@aws-sdk/client-sqs";
import { sendMessageToSQS } from "@utils/sqs";
import { SQSEventType } from "@models/interfaces/Reminders";
import { JobService } from "@functions/jobs/service";
import { randomUUID } from "crypto";
import { S3Service } from "@common/service/S3Service";

export interface UploadFiles {
  originalFilename?: string;
  fileType: string;
  s3Key: string;
  fileContent: any;
  fileName: string;
  variationEnforcedRequired?: boolean;
  variations?: FILE_VARIATION_TYPE[];
  // will not be stored but just for mapping purposes
  /** @deprecated */
  originalUrl?: string;
  uploadedBy: string;
  uploaderId?: string;
}

@injectable()
export class FileRecordService {
  s3Client: S3Client = null;
  cloudFrontClient: CloudFrontClient = null;
  cloudFrontPrivateKeyInitializing = false;
  sqsClient: SQSClient = null;

  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(SecretManager) private readonly secretManager: SecretManager,
    @inject(JobService) private readonly jobService: JobService,
    @inject(S3Service) private readonly s3Service: S3Service
  ) {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION });
    this.cloudFrontClient = new CloudFrontClient({
      region: process.env.REGION,
    });
    this.sqsClient = new SQSClient({ region: process.env.AWS_REGION });
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

  /**
   *
   * @param files
   * @param permissionMap
   * @param bucketName
   * @param region
   * @returns
   */
  async uploadFilesToBucketWithPermissions(
    files: UploadFiles[],
    permissionMap: FilePermissionsMap = ReadAllPermissions,
    bucketName: string = process.env.DEPLOYMENT_BUCKET,
    region: string = process.env.REGION
  ): Promise<IFileRecords[]> {
    /**
     * Known Issues
     * - We need a cleanup job here, if objects are uploaded to S3
     *  but saving to DB gets failed, we should run DELETE_S3_FILES job
     *
     * we need to do it many to many relation way, N no of S3 files can failed to upload
     * or M no if files get failed to stored in DB, we need to take care of all cases
     */
    const filePromises = files.map(({ s3Key, fileContent, fileName }) => {
      const uploadParams: PutObjectCommandInput = {
        Bucket: bucketName,
        Key: `${s3Key}/${fileName}`,
        Body: JSON.stringify(fileContent),
      };

      const command = new PutObjectCommand(uploadParams);
      return this.s3Client.send(command);
    });
    const responses = await Promise.allSettled(filePromises);
    return this.storeS3OutputToFileRecords(
      files,
      permissionMap,
      responses,
      bucketName,
      region
    );
  }

  async storeS3OutputToFileRecords(
    files: UploadFiles[],
    permissionMap: FilePermissionsMap = ReadAllPermissions,
    responses: PromiseSettledResult<PutObjectCommandOutput>[],
    bucketName: string = process.env.DEPLOYMENT_BUCKET,
    region: string = process.env.REGION
  ) {
    const dbEntries: IFileRecords[] = responses.map((x, index) => {
      const {
        s3Key,
        fileName,
        fileContent,
        fileType,
        originalFilename,
        variations,
        variationEnforcedRequired,
        uploadedBy,
        uploaderId,
      } = files[index];
      const details: any = x.status === "rejected" ? { error: x.reason } : {};

      details.variations = this.getVariationDetails(
        variationEnforcedRequired,
        variations
      );

      return {
        fileName,
        s3Key,
        fileSize: getByteSize(fileContent),
        fileUrl: constructS3Url(bucketName, region, s3Key, fileName),
        bucketName,
        region,
        fileType,
        originalFilename,
        permissions: permissionMap,
        status: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        details,
        uploadedBy,
        uploaderId,
      } as IFileRecords;
    });

    const dbResp: IFileRecords[] = await FileRecordModel.query()
      .insert(dbEntries)
      .onConflict()
      .ignore();
    await this.prepareImageVariationJob(dbResp);

    return dbResp;
  }

  /** @deprecated */
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
      const details: IFileRecordDetails =
        x.status === "rejected" ? { error: x.reason } : {};

      details.variations = {
        variationStatus: checkVariationStatus("contentType"),
        variationSizes: ["THUMBNAIL"],
      };
      const fileName = getFileNameWithoutExtension(fileNameWithExt);
      return {
        bucketName: destinationBucket,
        region: destinationRegion,
        fileName,
        s3Key: destinationKey.replace(fileNameWithExt, ""),
        fileUrl: constructS3Url(
          destinationBucket,
          destinationRegion,
          destinationKey,
          fileName
        ),
        fileType: contentType,
        originalFilename,
        permissions: permissionMap,
        status: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
        fileSize: x.status === "fulfilled" ? x.value.size : 0,
        details,
      } as IFileRecords;
    });

    const dbResp: IFileRecords[] = await FileRecordModel.query().insert(
      dbEntries
    );
    await this.prepareImageVariationJob(dbResp);

    return dbResp;
  }

  async copyFilesToBucketWithPermission(
    files: {
      originalFilename: string;
      sourceKey: string;
      destinationKey: string;
    }[],
    deleteOriginal: boolean = false,
    sourceBucket: string = process.env.DEPLOYMENT_BUCKET,
    sourceRegion: string = process.env.REGION,
    uploadedBy: string = "SYSTEM",
    uploaderId?: string,
    variations: FILE_VARIATION_TYPE[] = ["THUMBNAIL"],
    permissionMap = ReadAllPermissions,
    variationEnforcedRequired = false,
    destinationBucket: string = process.env.DEPLOYMENT_BUCKET,
    destinationRegion: string = process.env.REGION
  ): Promise<IFileRecords[]> {
    const copyResponse = await this.s3Service.copyS3ObjectsWithHeads(
      files,
      deleteOriginal,
      sourceBucket,
      sourceRegion,
      destinationBucket,
      destinationRegion
    );

    const dbEntries: IFileRecords[] = copyResponse.newLocations.map(
      (x, index) => {
        const head = copyResponse.heads[index];
        const { destinationKey, originalFilename } = files[index];
        const fileNameWithExt = destinationKey.split("/").at(-1);
        const details: IFileRecordDetails =
          x.status === "rejected" ? { error: x.reason } : {};

        details.variations = this.getVariationDetails(
          variationEnforcedRequired,
          variations
        );

        const fileName = getFileNameWithoutExtension(fileNameWithExt);
        const fileType =
          head.status === "fulfilled"
            ? head.value.ContentType
            : getFileContentType(fileName.split("/").at(-1));
        const fileNameWithNewExt = `${fileName}.${getFileExtension(fileType)}`;

        return {
          bucketName: destinationBucket,
          region: destinationRegion,
          fileName: fileNameWithNewExt,
          s3Key: destinationKey.replace(fileNameWithExt, ""),
          fileUrl: constructS3Url(
            destinationBucket,
            destinationRegion,
            destinationKey,
            fileName
          ),
          fileType:
            head.status === "fulfilled"
              ? head.value.ContentType
              : getFileContentType(fileName.split("/").at(-1)),
          originalFilename,
          permissions: permissionMap,
          status: x.status === "fulfilled" ? "UPLOADED" : "ERROR",
          fileSize:
            head.status === "fulfilled" ? bytes(head.value.ContentLength) : 0,
          details,
          uploadedBy,
          uploaderId,
        } as IFileRecords;
      }
    );

    const dbResp: IFileRecords[] = await FileRecordModel.query().insert(
      dbEntries
    );
    await this.prepareImageVariationJob(dbResp);

    return dbResp;
  }

  async prepareImageVariationJob(entries: IFileRecords[]) {
    // We are not handling it for now;
    // this is working code of job which has to be created
    const variationRequired = entries.filter(
      (x) => x.details?.variations?.variationStatus === "REQUIRED"
    );

    if (variationRequired.length > 0) {
      const job = await JobsModel.query().insert({
        uploadedBy: "SYSTEM",
        jobType: "CREATE_MEDIA_FILE_VARIATIONS",
        details: { files: variationRequired?.map((x) => x.id) || [] },
        jobStatus: "PENDING",
      } as IJob);
      await sendMessageToSQS(
        this.sqsClient,
        job,
        process.env.IMAGE_PROCESSING_QUEUE_URL
      );
      await job.$query().patchAndFetchById(job.id, { jobStatus: "QUEUED" });
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
    const cdnUrl = `${process.env.CLOUD_FRONT_URL}/${fileKey}`;
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

  /**
   *
   * @param newFileUrl
   * @param s3FolderPath
   * @param tableName
   * @param tableRowId
   * @param tableColumnName
   * @param uploadedBy
   * @param uploaderId
   * @param oldAvatarRecord
   * @param variations
   * @param permissionMap
   * @param variationEnforcedRequired
   * @param newS3FileName Better not to pass this, unless required
   * @returns
   */
  async avatarUploadHelper(
    newFileUrl: string,
    s3FolderPath: string,
    tableName: string,
    tableRowId: string,
    tableColumnName: string,
    uploadedBy: string = "SYSTEM",
    uploaderId?: string,
    oldAvatarRecord?: IFileRecords,
    variations: FILE_VARIATION_TYPE[] = ["THUMBNAIL"],
    permissionMap = ReadAllPermissions,
    variationEnforcedRequired = false,
    newS3FileName = ``
  ) {
    /**
     * We have determined that this is new url
     * Now we have to upload it to S3 and create record
     * of file permissions. Then also add a job for image
     * processing.
     */

    let fileRecordAdded = false;
    let fileRecordLinked = false;
    let newAvatarRecord = null;
    let result = {};
    const keys = getKeysFromS3Url(newFileUrl);
    const originalFilename = keys.fileKey.split("/").at(-1);

    const newFileName =
      newS3FileName?.trim().length > 0
        ? newS3FileName
        : `${randomUUID()}.${getFileExtension(
            getFileContentType(originalFilename)
          )}`;
    try {
      const newFileRecords = await this.copyFilesToBucketWithPermission(
        [
          {
            destinationKey: `${s3FolderPath}/${newFileName}`,
            sourceKey: keys.fileKey,
            originalFilename,
          },
        ],
        false,
        keys.bucketName,
        keys.region,
        uploadedBy,
        uploaderId,
        variations,
        permissionMap,
        variationEnforcedRequired
      );
      fileRecordAdded = true;
      await this.docClient
        .getKnexClient()
        .table(tableName)
        .update(tableColumnName, newFileRecords[0].id)
        .where("id", tableRowId);
      fileRecordLinked = true;
      result["message"] = "New avatar uploaded successfully";
    } catch (e) {
      result["error"] = e;
    } finally {
      if (fileRecordLinked) {
        // Delete the existing avatar and its variants
        // if and only if new image is uploaded to s3
        // and its file record is linked with our company
        if (oldAvatarRecord) {
          // Avatar already exists,
          // need to add a cleanup job
          // cleanup job will clean first variations, then file record

          // Save this step for the end
          await this.jobService.createAndEnqueueJob(
            {
              uploadedBy: uploaderId ?? uploadedBy,
              jobType: "DELETE_FILE_RECORDS" as SQSEventType,
              details: {
                fileRecordId: oldAvatarRecord.id,
              },
            },
            process.env.JOB_QUEUE_URL
          );
        }
      } else if (fileRecordAdded) {
        // Record is added but not linked to its table, so it must be cleaned up
        await this.jobService.createAndEnqueueJob(
          {
            uploadedBy: uploaderId ?? uploadedBy,
            jobType: "DELETE_FILE_RECORDS" as SQSEventType,
            details: {
              fileRecordId: newAvatarRecord?.id,
            },
          },
          process.env.JOB_QUEUE_URL
        );
      }
    }
    return result;
  }

  getVariationDetails(
    variationEnforcedRequired: boolean = false,
    variations: FILE_VARIATION_TYPE[]
  ) {
    if (variationEnforcedRequired) {
      return {
        variationStatus: "REQUIRED" as VARIATION_STATUS,
        variationSizes: variations ?? ["THUMBNAIL"],
      };
    } else {
      return {
        variationStatus: checkVariationStatus("contentType"),
        variationSizes: variations ?? ["THUMBNAIL"],
      };
    }
  }
}

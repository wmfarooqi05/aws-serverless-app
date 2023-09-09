import { S3Service } from "@common/service/S3Service";
import { formatJSONResponse } from "@libs/api-gateway";
import { DatabaseService } from "@libs/database/database-service-objection";
import {
  FILE_VARIATION_TYPE,
  FileRecordModel,
  IFileRecords,
  variationMap,
} from "@models/FileRecords";
import { FileVariationModel, IFileVariation } from "@models/FileVariations";
import JobsModel, { IJob } from "@models/Jobs";
import bytes from "@utils/bytes";
import {
  deleteMessageFromSQS,
  markAsUnprocessedEvent,
  moveMessageToDLQ,
  sqsQueueUrlFromArn,
} from "@utils/sqs";
import { generateThumbnailFromHtml, imageResize } from "@utils/thumbnails";
import { SQSEvent } from "aws-lambda";
import { container } from "@common/container";
import { SQSClient } from "@aws-sdk/client-sqs";
import moment from "moment-timezone";
import { sqsDefaultConfig } from "@common/configs";

// move this to handler / service pattern
// if image variation need multiple endpoints
// or it grows
process.env.DB_CONNECTION_TIMEOUT_OVERRIDE = "10";
const s3Service: S3Service = container.resolve(S3Service);
const sqsClient: SQSClient = new SQSClient(sqsDefaultConfig);
container.resolve(DatabaseService);

export const handler = async (event: SQSEvent) => {
  // This is for dev testing
  console.log("event", event);
  if (process.env.STAGE === "local" && event.body) {
    event.Records = [JSON.parse(event.body)];
  }

  const { Records } = event;
  for (const record of Records) {
    console.log("record", record);
    const payload: IJob = JSON.parse(record.body);
    const jobType = payload.jobType;
    console.log("jobType", jobType);
    const jobId = payload.id;
    console.log("marking job as in progress", jobId);
    const jobItem: IJob = await JobsModel.query().patchAndFetchById(jobId, {
      jobStatus: "IN_PROGRESS",
    } as IJob);
    console.log("jobItem", jobItem);
    try {
      if (jobType === "CREATE_MEDIA_FILE_VARIATIONS") {
        console.log("inside media loop");
        const {
          details: { files },
        } = jobItem;

        console.log("files", files);
        const fileRecords: IFileRecords[] =
          await FileRecordModel.query().findByIds(files);

        console.log("fileRecords", fileRecords);
        for (const fileRecord of fileRecords) {
          const {
            fileType,
            fileUrl,
            details: {
              variations: { variationSizes, variationStatus },
            },
          } = fileRecord;
          if (!variationStatus || variationStatus === "NOT_REQUIRED") continue;
          let originalImageBuffer: any = await s3Service.downloadFileFromUrl(
            fileUrl
          );
          let fullSize = null;
          if (fileType.includes("html")) {
            const { htmlImageBuffer, pageSize } =
              await generateThumbnailFromHtml(originalImageBuffer);
            originalImageBuffer = htmlImageBuffer;
            fullSize = pageSize;
          }
          console.log("variationSizes", variationSizes);
          for (const variationSize of variationSizes) {
            if (
              fileType.includes("html") &&
              variationSize === "FULL_SNAPSHOT"
            ) {
              console.log("variationSize", variationSize);
              await convertAndResizeImage(
                originalImageBuffer,
                fileRecord,
                variationSize,
                fullSize.width,
                fullSize.height
              );
              console.log("variationSize", variationSize, " completed ");
            } else if (
              fileType.includes("image") ||
              fileType.includes("html")
            ) {
              console.log("variationSize", variationSize);
              const pageSize = variationMap[variationSize] || {
                width: 800,
                height: 600,
              };
              await convertAndResizeImage(
                originalImageBuffer,
                fileRecord,
                variationSize,
                pageSize.width,
                pageSize.height
              );
              console.log("variationSize", variationSize, " completed ");
            }
            //  else if (fileType.includes("pdf")) {
            //   const imageBuffer = await s3Service.downloadFileFromUrl(fileUrl);
            //   await convertAndResizeImage(imageBuffer, fileRecord, variationSize);
            // }
            // upload to bucket
            // add fileVariation object
            // return;
          }
          console.log("for variation loop ended");
        }
        await JobsModel.query().patchAndFetchById(jobId, {
          jobStatus: "SUCCESSFUL",
        } as IJob);
        console.log("marked job as successful");
        console.log("for fileRecords loop ended");
      } else {
        console.log("else unprocessed");
        await JobsModel.query().patchAndFetchById(jobId, {
          jobStatus: "UNPROCESSED",
        } as IJob);
        await markAsUnprocessedEvent(record);
      }
    } catch (e) {
      console.log("error", e);
      await JobsModel.query().patchAndFetchById(jobId, {
        jobStatus: "FAILED",
        details: {
          ...jobItem.details,
          error: {
            timestamp: moment().utc().format(),
            message: e.message,
            stackTrace: e.stack,
          },
        },
      });
      await moveMessageToDLQ(sqsClient, record);
    } finally {
      await deleteMessageFromSQS(sqsClient, record);
    }
    console.log("for Records loop ended");
    // mark job as completed
  }

  return formatJSONResponse("Job completed", 200);
};

export const convertAndResizeImage = async (
  htmlImageBuffer: string | Buffer,
  fileRecord: IFileRecords,
  variationSize: FILE_VARIATION_TYPE,
  width: number,
  height: number
): Promise<FileVariationModel> => {
  const { s3Key, fileName } = fileRecord;
  const resizeBuffer = await imageResize(htmlImageBuffer, width, height);
  const newFileName = `${fileName}_${variationSize}`;
  const uploadedFile = await s3Service.uploadContentToS3(
    `${s3Key}/${newFileName}.png`,
    resizeBuffer
  );
  console.log("uploading to: ", uploadedFile.fileUrl);
  return FileVariationModel.query()
    .insert({
      fileName: `${fileName}_${variationSize}`,
      fileNamePostfix: variationSize,
      fileType: "image/png",
      fileUrl: uploadedFile.fileUrl,
      status: "UPLOADED",
      fileSize: bytes(JSON.stringify(resizeBuffer))?.toString() || "",
      resolution: `${width}x${height}`,
      originalFileId: fileRecord.id,
    } as IFileVariation)
    .onConflict()
    .ignore();
};

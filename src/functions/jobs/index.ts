//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const importData = {
  handler: `${handlerPath(__dirname)}/import.importData`,
  events: [
    {
      http: {
        method: "post",
        path: "/jobs/importData",
        cors: true,
      },
    },
  ],
};

// const uploadCompanySheetToS3 = {
//   handler: `${handlerPath(__dirname)}/import.uploadCompanySheetToS3`,
//   events: [
//     {
//       http: {
//         method: "post",
//         path: "/jobs/uploadCompanySheetToS3",
//         cors: true,
//       },
//     },
//   ],
// };

// const importCompanySheetFromS3 = {
//   handler: `${handlerPath(__dirname)}/import.uploadCompanySheetToS3`,
//   events: [
//     {
//       eventBridge: {
//         pattern: {
//           source: ["aws.s3"],
//           "detail-type": ["AWS API Call via CloudTrail"],
//           detail: {
//             eventSource: ["s3.amazonaws.com"],
//             eventName: ["PutObject"],
//             requestParameters: {
//               bucketName: [process.env.DEPLOYMENT_BUCKET],
//             },
//             resources: ["arn:aws:s3:::my-s3-bucket/my-folder/*"],
//           },
//         },
//       },
//     },
//   ],
// };

const bulkCognitoSignup = {
  handler: `${handlerPath(__dirname)}/bulkSignupUpload.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "/jobs/bulk-signup",
        cors: true,
      },
    },
  ],
};

const streamRecordHelper = {
  handler: `${handlerPath(__dirname)}/dynamoDbStreamHandler.streamRecordHelper`,
  events: [
    {
      http: {
        method: "post",
        path: "/dynamo-stream",
        cors: true,
      },
    },
  ],
};

const uploadSignupBulkJob = {
  handler: `${handlerPath(__dirname)}/bulkSignupProcess.uploadSignupBulkJob`,
  events: [
    {
      http: {
        method: "post",
        path: "/jobs/bulk-signup-upload",
        cors: true,
      },
    },
  ],
};

// dev only
const bulkImportUsersProcessHandler = {
  handler: `${handlerPath(
    __dirname
  )}/bulkSignupProcess.bulkImportUsersProcessHandler`,
  events: [
    {
      http: {
        method: "post",
        path: "/jobs/bulk-signup-process",
        cors: true,
      },
    },
  ],
};

const handleDynamoStreamRecords = {
  handler: `${handlerPath(__dirname)}/dynamoDbStreamHandler.handleStreamRecords`,
  events: [
    {
      stream: {
        type: "dynamodb",
        arn: "arn:aws:dynamodb:ca-central-1:524073432557:table/Jobs/stream/2023-05-02T11:39:32.489",
        batchSize: 100,
      },
    },
  ],
};

const handleSESEmailToSNSEvent = {
  handler: `${handlerPath(__dirname)}/email.handleSESEmailToSNSEvent`,
  events: [
    {
      stream: {
        type: "dynamodb",
        arn: "arn:aws:dynamodb:ca-central-1:524073432557:table/Jobs/stream/2023-05-02T11:39:32.489",
        batchSize: 100,
      },
    },
  ],
};

export {
  importData,
  bulkCognitoSignup,
  bulkImportUsersProcessHandler,
  handleDynamoStreamRecords,
  uploadSignupBulkJob,
  streamRecordHelper,
  handleSESEmailToSNSEvent,
};

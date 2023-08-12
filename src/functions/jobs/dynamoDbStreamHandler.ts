import "reflect-metadata";
import { DynamoDBStreamEvent } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";

import JobsModel, { IJobData } from "@models/dynamoose/Jobs";
import { container } from "@common/container";
import { SQSEventType } from "@models/interfaces/Reminders";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const REGION = process.env.REGION;
// const STREAM_ARN =
//   "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2022-04-30T23:15:14.315";
// const streamClient = new DynamoDBStreamsClient({ region: REGION });

const sqsClient = new SQSClient({ region: REGION });

export const handleStreamRecords = async (event: DynamoDBStreamEvent) => {
  try {
    console.log("event", event);
    for (const record of event.Records) {
      console.log("record", record);
      const newImage: IJobData = unmarshall(record.dynamodb?.NewImage ?? {});
      const oldImage: IJobData = unmarshall(record.dynamodb?.OldImage ?? {});

      console.log(`New image: ${JSON.stringify(newImage)}`);
      console.log(`Old image: ${JSON.stringify(oldImage)}`);

      if (!oldImage.jobStatus && newImage.jobStatus === "PENDING") {
        const sqsOutput = await addJobToQueue(newImage.jobId, newImage.jobType);

        console.log("sqsOutput", sqsOutput);
        await JobsModel.update(
          { jobId: newImage.jobId },
          { jobStatus: "QUEUED" }
        );
      }
    }
  } catch (error) {
    console.error(`Error fetching records from stream: ${error}`);
  }
};

export const addJobToQueue = async (jobId: string, eventType: SQSEventType) => {
  try {
    let queueUrl =
      "https://sqs.ca-central-1.amazonaws.com/524073432557/job_queue_dev";

    if (
      eventType === "PROCESS_TEMPLATE" ||
      eventType === "BULK_EMAIL" ||
      eventType === "BULK_EMAIL_PREPARE"
    ) {
      queueUrl =
        "https://sqs.ca-central-1.amazonaws.com/524073432557/EmailQueue";
    }
    // else if (eventType === "CREATE_MEDIA_FILE_VARIATIONS") {
    //   queueUrl =
    //     "https://sqs.ca-central-1.amazonaws.com/524073432557/media_queue_dev";
    // }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ jobId, eventType }),
    });

    return sqsClient.send(command);
  } catch (e) {
    console.log("error", e);
  }
};

// Commented for DEV
// const dynamoDBClient = new DynamoDBClient({ region: REGION });
/**
 * @DEV
 * @param event
 */
// export const streamRecordHelper = async (event) => {
//   const jobId = "8441796b-e14f-4f32-b037-5d018f1fc7c1";
//   const job: IJobData = await JobsModel.get(jobId);
//   await JobsModel.update({ jobId }, { jobStatus: "QUEUED" });

//   return;
//   const describe = await dynamoDBClient.send(
//     new DescribeTableCommand({
//       TableName: "Jobs",
//     })
//   );
//   const streamArn = describe.Table.LatestStreamArn;
//   console.log("streamArn", streamArn);
//   const describeStreamCommand = new DescribeStreamCommand({
//     StreamArn: streamArn,
//     Limit: 10,
//   });
//   const describeStreamResponse = await streamClient.send(describeStreamCommand);
//   console.log("describeStreamResponse", describeStreamResponse);

//   const shards = describeStreamResponse.StreamDescription?.Shards;
//   if (!shards) {
//     console.error("Failed to retrieve shards from the stream.");
//     return;
//   }

//   for (const shard of shards) {
//     console.log("shard", shard);

//     const shardIteratorCommand = new GetShardIteratorCommand({
//       ShardId: shard.ShardId,
//       ShardIteratorType: "LATEST",
//       StreamArn: streamArn,
//     });
//     const shardIteratorResponse = await streamClient.send(shardIteratorCommand);

//     const shardIterator = shardIteratorResponse.ShardIterator;
//     if (!shardIterator) {
//       console.error(
//         `Failed to retrieve ShardIterator for shard ${shard.ShardId}.`
//       );
//       continue;
//     }
//     console.log("shardIterator", shardIterator);

//     const getRecordsCommand = new GetRecordsCommand({
//       ShardIterator: shardIterator,
//     });
//     const getRecordsResponse: any = await streamClient.send(getRecordsCommand);
//     console.log("getRecordsResponse", getRecordsResponse);
//     await handleStreamRecords({
//       Records: getRecordsResponse.Records,
//     });
//   }
// };

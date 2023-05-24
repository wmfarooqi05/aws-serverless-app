import "reflect-metadata";
import { DynamoDBStreamEvent } from "aws-lambda";
import {
  DescribeTableCommand,
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import {
  DynamoDBStreamsClient,
  DescribeStreamCommand,
  GetRecordsCommand,
  ListStreamsCommand,
  GetShardIteratorCommand,
} from "@aws-sdk/client-dynamodb-streams";
import { uploadContentToS3 } from "./upload";
import JobsModel, { IJobData } from "@models/dynamoose/Jobs";
import { container } from "tsyringe";
import { SQSService } from "@functions/sqs/service";

const REGION = process.env.REGION;
const STREAM_ARN =
  "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2022-04-30T23:15:14.315";
const streamClient = new DynamoDBStreamsClient({ region: "REGION" });

const dynamoDBClient = new DynamoDBClient({ region: REGION });

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
        const sqsOutput = await container
          .resolve(SQSService)
          .addJobToQueue(newImage.jobId, newImage.jobType);

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

/**
 * @DEV
 * @param event
 */
export const streamRecordHelper = async (event) => {
  const jobId = "8441796b-e14f-4f32-b037-5d018f1fc7c1";
  const job: IJobData = await JobsModel.get(jobId);
  await JobsModel.update({ jobId }, { jobStatus: "QUEUED" });

  return;
  const describe = await dynamoDBClient.send(
    new DescribeTableCommand({
      TableName: "Jobs",
    })
  );
  const streamArn = describe.Table.LatestStreamArn;
  console.log("streamArn", streamArn);
  const describeStreamCommand = new DescribeStreamCommand({
    StreamArn: streamArn,
    Limit: 10,
  });
  const describeStreamResponse = await streamClient.send(describeStreamCommand);
  console.log("describeStreamResponse", describeStreamResponse);

  const shards = describeStreamResponse.StreamDescription?.Shards;
  if (!shards) {
    console.error("Failed to retrieve shards from the stream.");
    return;
  }

  for (const shard of shards) {
    console.log("shard", shard);

    const shardIteratorCommand = new GetShardIteratorCommand({
      ShardId: shard.ShardId,
      ShardIteratorType: "LATEST",
      StreamArn: streamArn,
    });
    const shardIteratorResponse = await streamClient.send(shardIteratorCommand);

    const shardIterator = shardIteratorResponse.ShardIterator;
    if (!shardIterator) {
      console.error(
        `Failed to retrieve ShardIterator for shard ${shard.ShardId}.`
      );
      continue;
    }
    console.log("shardIterator", shardIterator);

    const getRecordsCommand = new GetRecordsCommand({
      ShardIterator: shardIterator,
    });
    const getRecordsResponse: any = await streamClient.send(getRecordsCommand);
    console.log("getRecordsResponse", getRecordsResponse);
    await handleStreamRecords({
      Records: getRecordsResponse.Records,
    });
  }
};

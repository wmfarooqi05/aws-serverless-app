import { SQSService } from '@functions/sqs/service';
import * as AWS from 'aws-sdk';
import { container } from 'tsyringe';

const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const QUEUE_URL = 'your-sqs-queue-url';

export const processPendingJobs = async (event: any) => {
  const records = event.Records;

  for (const record of records) {
    const job = await dynamodb.get({
      TableName: 'Jobs',
      Key: {
        jobId: record.dynamodb.NewImage.jobId.S,
      },
    }).promise();

    // job.Item.
    // await container.resolve(SQSService).enqueueItems()
  }
};

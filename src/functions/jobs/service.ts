import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import { inject, injectable } from "tsyringe";
import JobsModel, { IJob } from "@models/Jobs";
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import { sendMessageToSQS } from "@utils/sqs";

@injectable()
export class JobService {
  sqsClient: SQSClient = null;
  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {
    this.sqsClient = new SQSClient({ region: process.env.AWS_REGION });
  }

  /**
   *
   * @param jobItem
   * @param queueUrl
   * @param jobEnqueuePayload
   * Optional: payload, if we want to enqueue payload in sqs different than jobItem
   */
  async createAndEnqueueJob(
    jobPayload: IJob,
    queueUrl: string
  ): Promise<{ job: IJob; queueOutput: SendMessageCommandOutput }> {
    const job = await JobsModel.query().insert(jobPayload);
    const queueOutput = await sendMessageToSQS(this.sqsClient, job, queueUrl);
    await job.$query().patch({
      jobStatus: "QUEUED",
    } as IJob);
    return { job, queueOutput };
  }
}

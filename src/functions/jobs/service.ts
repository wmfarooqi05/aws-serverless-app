import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import { inject, singleton } from "tsyringe";
import JobsModel, { IJob } from "@models/Jobs";
import {
  SQSClient,
  SQSClientConfig,
  SendMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import { sendMessageToSQS } from "@utils/sqs";
import { sqsDefaultConfig } from "@common/configs";
import { IEmployeeJwt } from "@models/interfaces/Employees";

@singleton()
export class JobService {
  sqsClient: SQSClient = null;
  constructor(@inject(DatabaseService) private readonly _: DatabaseService) {
    this.sqsClient = new SQSClient(sqsDefaultConfig);
  }

  async getAllJobs(employee: IEmployeeJwt, body) {
    return JobsModel.query().withGraphFetched("executionHistory");
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

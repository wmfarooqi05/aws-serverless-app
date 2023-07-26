import JobsModel, { IJob } from "@models/Jobs";
import moment from "moment-timezone";

/**
 * Make sure DBService is injected in calling service
 * @param jobId
 * @param resp
 */
export const markJobAsSuccessful = async (
  jobId: string,
  resp
): Promise<void> => {
  await JobsModel.query()
    .findById(jobId)
    .patch({
      jobStatus: "SUCCESSFUL",
      jobResult: resp,
    } as IJob);
  console.log(`marked jobId ${jobId} as successful`);
};

/**
 * Make sure DBService is injected in calling service
 * @param job
 * @param resp
 */
export const markJobAsFailed = async (job: IJob, resp: any): Promise<void> => {
  const result = job.jobResult || {};
  const errorObj = {
    error: (resp && JSON.stringify(resp)) || "An error occurred",
    updatedAt: moment().utc().format(),
  };
  console.log("job failed errorObj", errorObj);
  if (result?.errors?.length) {
    result.errors.push(errorObj);
  } else {
    result.errors = [errorObj];
  }
  await JobsModel.query()
    .findById(job.id)
    .patch({
      jobStatus: "FAILED",
      jobResult: result,
    } as IJob);
  console.log("marked job as failed");
};

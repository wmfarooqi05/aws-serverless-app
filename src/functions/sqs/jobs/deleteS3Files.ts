import { deleteObjectFromS3Url } from "@functions/jobs/upload";
import JobExecutionHistoryModel, {
  IJobExecutionData,
  IJobExecutionHistory,
} from "@models/JobExecutionHistory";
import JobsModel, { IJob } from "@models/Jobs";

/**
 * Delete files from S3
 * @param jobItem
 *
 */
export const deleteS3Files = async (
  jobItem: IJob
): Promise<IJobExecutionData> => {
  try {
    const {
      details: { s3CleanupFiles },
    } = jobItem;

    const promises = await Promise.all(
      (s3CleanupFiles as string[]).map((x) => deleteObjectFromS3Url(x))
    );
    return { jobResult: promises, jobStatus: "SUCCESSFUL" };
  } catch (e) {
    return {
      jobResult: { stack: e.stack, message: e.message },
      jobStatus: "FAILED",
    };
  }
};

import { deleteObjectFromS3Url } from "@functions/jobs/upload";
import { IJobData } from "@models/dynamoose/Jobs";

/**
 * Delete files from S3
 * @param jobItem
 *
 */
export const deleteS3Files = async (jobItem: IJobData) => {
  const {
    details: { s3CleanupFiles },
  } = jobItem;

  const promises = await Promise.all(
    (s3CleanupFiles as string[]).map((x) => deleteObjectFromS3Url(x))
  );
  jobItem.jobStatus = "SUCCESSFUL";
  jobItem.result = { results: promises } as any;
  await jobItem.save();
};

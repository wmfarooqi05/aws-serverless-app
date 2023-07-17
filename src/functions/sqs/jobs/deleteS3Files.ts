import { deleteObjectFromS3Url } from "@functions/jobs/upload";
import JobsModel, { IJob } from "@models/Jobs";

/**
 * Delete files from S3
 * @param jobItem
 *
 */
export const deleteS3Files = async (jobItem: IJob) => {
  const {
    details: { s3CleanupFiles },
  } = jobItem;

  const promises = await Promise.all(
    (s3CleanupFiles as string[]).map((x) => deleteObjectFromS3Url(x))
  );
  await JobsModel.query().patchAndFetchById(jobItem.id, {
    jobStatus: "SUCCESSFUL",
    jobResult: { results: promises } as any,
  } as IJob);
};

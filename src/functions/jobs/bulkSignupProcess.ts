import "reflect-metadata";
import { CustomError } from "@helpers/custom-error";
import JobsResultsModel, { IJobsResults } from "@models/JobsResult";
import { downloadFromS3Readable } from "./upload";
import { container } from "tsyringe";
import { DatabaseService } from "@libs/database/database-service-objection";
import xlsx from "xlsx";
import { Readable } from "stream";

export const bulkImportUsersProcessHandler = async (event) => {
  const payload = JSON.parse(event.body);

  container.register(DatabaseService);
  const job = await JobsResultsModel.query().findById(payload.id);
  await bulkImportUsersProcess(job);
};

export const bulkImportUsersProcess = async (job: IJobsResults) => {
  if (!job.details.originalFileS3Url) {
    throw new CustomError("no valid file path for S3", 400);
  }
  const fileStream = await downloadFromS3Readable(
    job.details.originalFileS3Url
  );
  if (!fileStream) {
    throw new CustomError("No file download from S3", 404);
  }
  const data: any = await importDataFromXlsx(fileStream);
  if (!data) {
    throw new CustomError("No data found", 400);
  }

  const transformedData = await transformDataHelper(employeeId, data);
  if (!transformedData || transformedData?.length === 0) {
    throw new CustomError("No valid data found", 400);
  }

  const resp = await writeDataToDB(transformedData);
  const url = await uploadToS3("job_result", resp);
  await JobsResultsModel.query().insert({
    jobResultUrl: JSON.stringify({ url }),
    jobType: "UPLOAD_COMPANIES_FROM_EXCEL",
    uploadedBy: employeeId,
  });
};

/**
 * It will accept a file
 * @param file
 * @returns
 */
const importDataFromXlsx = async (file: Readable) => {
  const workbook = await xlsx.read(file, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  return jsonData;
};

const transformDataHelper = (employeeId, data) => {
  // @Note not adding extra use cases without discussion
  const transformedData = [];
  // transformData?.forEach((record) => {
  //   const concernedPersons: IConcernedPerson[] =
  //     createConcernedPersonHelper(record);
  //   record["Remarks"] = "This is first remark";
  //   const notes =
  //     record["Remarks"]?.trim().length > 0
  //       ? [
  //           {
  //             id: randomUUID(),
  //             notesText: record["Remarks"],
  //             addedBy: employeeId,
  //             isEdited: false,
  //             updatedAt: moment().utc().format(),
  //           },
  //         ]
  //       : [];

  //   const item = {
  //     companyName: record["Company Name"] || "not found",
  //     addresses:
  //       record["Address"]?.trim().length > 0
  //         ? [createAddress(record["Address"])]
  //         : [],
  //     concernedPersons,
  //     createdBy: employeeId,
  //     notes,
  //   };
  //   transformedData.push(item);
  // });
  // return transformedData;
};

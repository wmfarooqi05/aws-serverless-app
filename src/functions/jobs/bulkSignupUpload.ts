import "reflect-metadata";

import { IEmployeePaginated } from "@models/Employees";

import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import * as xlsx from "xlsx";

import { allowRoleWrapper } from "@middlewares/jwtMiddleware";
import { IEmployeeJwt, RolesEnum } from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import JobsResultsModel, { IJobsResults } from "@models/JobsResult";
import { uploadToS3 } from "./upload";
import { container } from "tsyringe";
import { SQSService } from "@functions/sqs/service";
import { DatabaseService } from "@libs/database/database-service-objection";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports

const bulkCognitoSignup: ValidatedEventAPIGatewayProxyEvent<
  IEmployeePaginated
> = async (event) => {
  try {
    // we will replace logic with S3 setup
    const manager: IEmployeeJwt = event.employee;
    // await validateBody
    const payload = JSON.parse(event.body);
    const filePath: string = payload.filePath;
    const type: string = filePath?.split(".")[filePath.split(".")?.length - 1];
    if (!filePath) {
      throw new CustomError("Filepath not provided", 400);
    } else if (type !== "xlsx") {
      throw new CustomError("Only .xlsx files are supported", 400);
    } else if (!manager.sub) {
      throw new CustomError("Employee Id not found", 400);
    }

    /**

    const data: any = await importDataFromXlsx(filePath);
    await validateSignupData(data);

    // data is validated, upload this file to S3 as it is
    const originalFileS3Url = await uploadToS3("job_result", data);
     */
    await container.resolve(DatabaseService);
    const job: IJobsResults = await JobsResultsModel.query().insert({
      jobType: "UPLOAD_COMPANIES_FROM_EXCEL",
      uploadedBy: manager.sub,
      resultType: "PENDING",
      details: {
        originalFileS3Url: "originalFileS3Url",
      },
    });

    const resp1 = await container.resolve(SQSService).addJobToQueue(job.id);
    return formatJSONResponse({ resp1 }, 200);
    await JobsResultsModel.query().insert({
      jobType: "BULK_SIGNUP_USERs_TO_COGNITO",
    });

    const transformedData = await transformDataHelper(employeeId, data);
    if (!transformedData || transformedData?.length === 0) {
      throw new CustomError("No valid data found", 400);
    }

    const resp = await writeDataToDB(transformedData);
    const url = await uploadToS3("job_result", resp);

    // in next step when we divide this job, we will add S3 url here and return;
    // this endpoint will be a short lived endpoint
    // longer things will run in job, not here
    await JobsResultsModel.query().insert({
      jobType: "UPLOAD_COMPANIES_FROM_EXCEL",
      uploadedBy: manager.sub,
      resultType: "PENDING",
    });

    return formatJSONResponse({ message: "Added data successfully" }, 200);
  } catch (e) {
    return formatJSONResponse(
      { message: "Error adding data", details: e.message },
      500
    );
  }
};

const importDataFromXlsx = async (filePath: string) => {
  const workbook = await xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  return jsonData;
};

const validateSignupData = async (data) => {
  if (!data) {
    throw new CustomError("No data found", 400);
  }
};

export const handler = allowRoleWrapper(
  bulkCognitoSignup,
  RolesEnum.SALES_REP_GROUP
);

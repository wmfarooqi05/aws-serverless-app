import "reflect-metadata";
import { CustomError } from "@helpers/custom-error";
// import JobsModel, { IJobs } from "@models/pending/[x]Jobs";
import {
  downloadFromS3Readable,
  fileExists,
  uploadContentToS3,
  uploadFileToS3,
  uploadJsonAsXlsx,
  uploadToS3,
} from "./upload";
import { container } from "tsyringe";
import { DatabaseService } from "@libs/database/database-service-objection";
import xlsx from "xlsx";
import Joi from "joi";
import { RolesArray } from "@models/interfaces/Employees";
import { IEmployee, RolesEnum } from "@models/interfaces/Employees";
import EmployeeModel from "@models/Employees";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";
import JobsModel, { IJobData } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  CognitoIdentityProviderClient,
  SignUpCommand,
  SignUpCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import passwordGenerator from "generate-password";

export const bulkImportUsersProcessHandler = async (event) => {
  const errors = [];
  const payload = JSON.parse(event.body);
  let result = {};
  try {
    const jobData: IJobData = await JobsModel.get(payload.jobId);
    // if (jobData.jobStatus === "COMPLETED") {
    //   return formatJSONResponse({ message: "Job already completed" }, 200);
    // }
    const signupFile = await downloadFromS3Readable(jobData?.details?.fileKey);
    // somehow content we got it like this
    interface ITmpEmployee {
      name: string;
      email: string;
      phone_number: string;
      team_id: string;
      reporting_manager: string;
      role: string;
    }

    let newEmployees: ITmpEmployee[] = await importDataFromXlsx(signupFile);
    if (!newEmployees.length) {
      return formatErrorResponse({
        message: "File doesn't exists",
        statusCode: 404,
      });
    }

    const docClient = container.resolve(DatabaseService);
    const existingEmployees = await EmployeeModel.query().whereIn(
      "email",
      newEmployees.map((x) => x.email)
    );
    if (existingEmployees.length > 0) {
      newEmployees = newEmployees.filter(
        (x) => !existingEmployees.find((y) => y.email === x.email)
      );
    }
    if (newEmployees.length > 0) {
      await Joi.array()
        .items({
          name: Joi.string().required().min(3),
          email: Joi.string().email().required(),
          phone_number: Joi.string().required(),
          team_id: Joi.string(),
          reporting_manager: Joi.string().email(),
          role: Joi.string()
            .valid(...RolesArray)
            .required(),
        })
        .validateAsync(newEmployees);

      const existingManagerEmails = [
        ...new Set(
          newEmployees
            .filter((x) => x.reporting_manager)
            .map((x) => x.reporting_manager)
        ),
      ];
      const existingManagers: IEmployee[] = await EmployeeModel.query().whereIn(
        "email",
        existingManagerEmails
      );
      const newManagersEmails = existingManagerEmails.filter(
        (x) => !existingManagers.map((y) => y.email).includes(x)
      );

      const newManagers = newEmployees.filter((x) =>
        newManagersEmails.includes(x.email)
      );
      const roles = [...newManagers, ...existingManagers].map((x) => x.role);
      if (roles.includes(RolesArray[RolesEnum.SALES_REP_GROUP])) {
        throw new CustomError("Reporting Manager cannot be a sales rep", 400);
      }

      const employeesPayload: IEmployee[] = [];
      for (const x of newEmployees) {
        const manager = existingManagers.find(
          (y) => y.email === x.reporting_manager
        );
        employeesPayload.push({
          name: x.name,
          email: x.email,
          phoneNumber: x.phone_number,
          role: x.role,
          reportingManager: manager?.id ?? null,
        });
      }

      await docClient.getKnexClient().transaction(async (trx) => {
        try {
          await EmployeeModel.query(trx).insert(employeesPayload);
          const newManagers: IEmployee[] = await EmployeeModel.query(
            trx
          ).whereIn("email", newManagersEmails);
          const updatePromises = [];
          for (const m of newManagers) {
            const eez = newEmployees.filter(
              (x) => x.reporting_manager === m.email
            );
            updatePromises.push(
              EmployeeModel.query(trx)
                .patch({ reportingManager: m.id })
                .whereIn(
                  "email",
                  eez.map((x) => x.email)
                )
            );
          }
          await Promise.all(updatePromises);

          const client = new CognitoIdentityProviderClient({
            region: process.env.REGION,
          });

          const userPoolId = process.env.COGNITO_USER_POOL_ID;
          const payloads = [];
          const password = "Password@123";
          const signupPromises = employeesPayload.map((employee) => {
            const { email, name, phoneNumber } = employee;
            const params: AdminCreateUserCommandInput = {
              UserPoolId: userPoolId,
              Username: email.split("@")[0],
              TemporaryPassword: password,
              UserAttributes: [
                {
                  Name: "email",
                  Value: email,
                },
                {
                  Name: "name",
                  Value: name,
                },
                {
                  Name: "phone_number",
                  Value: phoneNumber,
                },
              ],
            };

            payloads.push({
              email,
              name,
              password,
              phoneNumber,
            });
            const command = new AdminCreateUserCommand(params);
            return client.send(command);
          });

          const _result = await Promise.all(signupPromises);

          result = await uploadJsonAsXlsx(
            `jobs/bulk_signup/${jobData.jobId}/result/data.xlxs`,
            _result.map((x) => x.User)
          );
          await trx.commit();
        } catch (e) {
          errors.push({
            message: e.message,
          });
          await trx.rollback();
        }
      });
    }

    if (errors.length > 0) {
      const statusDynamoPayload = {
        jobStatus: "COMPLETED",
        result,
      };
      await JobsModel.update({ jobId: jobData.jobId }, statusDynamoPayload);
    }
  } catch (e) {
    errors.push({ message: e.message });
  }
  if (errors.length) {
    try {
      await JobsModel.update(
        { jobId: payload.jobId },
        {
          jobStatus: "ERROR",
          result: { errors },
        }
      );
    } catch (e) {
      console.log("e", e);
    }
    return {
      statusCode: 400,
      body: JSON.stringify(errors),
    };
  }
  return formatJSONResponse({ result }, 200);
};

/**
 * It will accept a file
 * @param file
 * @returns
 */
const importDataFromXlsx = async (buffer: Buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  return jsonData;
};

const uploadSignupBulkJobHandler = async (event) => {
  const { employee, body } = event;
  const payload = JSON.parse(body);
  await fileExists(payload.filePath);
  const jobId = randomUUID();
  const details = await uploadFileToS3(
    payload.filePath,
    `jobs/bulk_signup/${jobId}/data.xlsx`
  );
  const job = new JobsModel({
    jobId,
    uploadedBy: employee.sub,
    jobType: "BULK_SIGNUP",
    details,
    jobStatus: "PENDING",
  });
  await job.save();
  return formatJSONResponse(job, 201);
};

export const uploadSignupBulkJob = checkRolePermission(
  uploadSignupBulkJobHandler,
  "COMPANY_READ"
);

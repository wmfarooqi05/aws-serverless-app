import "reflect-metadata";
import { CustomError } from "@helpers/custom-error";
// import JobsModel, { IJobs } from "@models/pending/[x]Jobs";
import {
  downloadFromS3Readable,
  fileExists,
  uploadFileToS3,
  uploadJsonAsXlsx,
} from "./upload";
import { container } from "tsyringe";
import { DatabaseService } from "@libs/database/database-service-objection";
import xlsx from "xlsx";
import Joi from "joi";
import { IEmployeeJwt, RolesArray } from "@models/interfaces/Employees";
import { IEmployee, RolesEnum } from "@models/interfaces/Employees";
import EmployeeModel from "@models/Employees";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";
import JobsModel, { IJobData } from "@models/dynamoose/Jobs";
import { randomUUID } from "crypto";
import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminGetUserCommandInput,
  AdminGetUserCommandOutput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

export const bulkImportUsersProcessHandler = async (event) => {
  const errors = [];
  const payload = JSON.parse(event.body);
  let result = {};
  try {
    const jobData: IJobData = await JobsModel.get(payload.jobId);
    // if (jobData.jobStatus === "SUCCESSFUL") {
    //   return formatJSONResponse({ message: "Job already completed" }, 200);
    // }
    const signupFile = await downloadFromS3Readable(jobData?.details?.fileKey);
    interface ITmpEmployee {
      name: string;
      email: string;
      phone_number: string;
      team_id: string;
      reporting_manager: string;
      role: string;
    }

    let employeeFromSheet: ITmpEmployee[] = await importDataFromXlsx(
      signupFile
    );
    if (!employeeFromSheet.length) {
      return formatErrorResponse({
        message: "File doesn't exists or empty",
        statusCode: 404,
      });
    }

    const docClient = container.resolve(DatabaseService);
    const existingDbEmployees: IEmployee[] =
      await EmployeeModel.query().whereIn(
        "email",
        employeeFromSheet.map((x) => x.email)
      );

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
      .validateAsync(employeeFromSheet);

    const allManagerEmails = [
      ...new Set(
        employeeFromSheet.map((x) => x.reporting_manager).filter((x) => x)
      ),
    ];
    const existingManagers: IEmployee[] = existingDbEmployees.filter((x) =>
      allManagerEmails.includes(x.email)
    );
    const newManagersEmails = allManagerEmails.filter(
      (x) => !existingManagers.map((y) => y.email).includes(x)
    );

    const newManagers: ITmpEmployee[] = employeeFromSheet.filter((x) =>
      newManagersEmails.includes(x.email)
    );
    if (
      [...newManagers, ...existingManagers]
        .map((x) => x.role)
        .includes(RolesArray[RolesEnum.SALES_REP_GROUP])
    ) {
      throw new CustomError("Reporting Manager cannot be a sales rep", 400);
    }

    const employeesPayload: IEmployee[] = [];
    for (const x of employeeFromSheet) {
      const manager = existingManagers.find(
        (y) => y.email === x.reporting_manager
      );
      employeesPayload.push({
        name: x.name,
        username: x.email.split("@")[0],
        email: x.email,
        phoneNumber: x.phone_number,
        role: x.role,
        reportingManager: manager?.id ?? null,
        teamId: x.team_id,
        addedBy: jobData.uploadedBy,
      });
    }

    await docClient.getKnexClient().transaction(async (trx) => {
      try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const payloads = [];
        const password = "Password@123";

        const client = new CognitoIdentityProviderClient({
          region: process.env.REGION,
        });

        if (payload.deleteAll === true || payload.deleteAll === "true") {
          await deleteUsers(client, payload.deleteArr);
        }

        const signupPromises = employeesPayload.map((employee) => {
          const { email, name, phoneNumber, username } = employee;
          const UserAttributes = [
            {
              Name: "email",
              Value: email,
            },
            {
              Name: "name",
              Value: name,
            },
          ];
          if (phoneNumber) {
            UserAttributes.push({
              Name: "phone_number",
              Value: phoneNumber,
            });
          }
          const params: AdminCreateUserCommandInput = {
            UserPoolId: userPoolId,
            Username: username,
            TemporaryPassword: password,
            UserAttributes,
          };

          payloads.push({
            email,
            name,
            password,
            phoneNumber,
          });
          AdminDeleteUserCommand;
          const command = new AdminCreateUserCommand(params);
          return client.send(command);
        });

        const cognitoSignupResult = await Promise.allSettled(signupPromises);
        // run foreach on this to sepearte fullfilled and rejected
        const employeeToBeCreated: IEmployee[] = [];
        const failedEmployeeArray = [];
        let existingCognitoEmployees: IEmployee[] = [];
        cognitoSignupResult.forEach((r, index) => {
          if (r.status === "fulfilled") {
            const sub = r.value.User.Attributes.find(
              (x) => x.Name === "sub"
            ).Value;
            employeesPayload[index].id = sub; //@TODO remove
            employeesPayload[index].sub = sub;
            employeeToBeCreated.push(employeesPayload[index]);
          } else if (r?.reason?.name === "UsernameExistsException") {
            existingCognitoEmployees.push(employeesPayload[index]);
          } else {
            failedEmployeeArray.push(employeesPayload[index]);
          }
        });

        const nonCognitoUsersExistingInDB = [];
        const usersOnCognitoAndDB = [];
        existingCognitoEmployees.forEach((x) => {
          const emp = existingDbEmployees.find((y) => y.email === x.email);
          if (!emp) {
            nonCognitoUsersExistingInDB.push(x);
          } else {
            usersOnCognitoAndDB.push(emp);
          }
        });
        if (nonCognitoUsersExistingInDB.length) {
          const cognitoUsers = await getUsers(
            client,
            nonCognitoUsersExistingInDB.map((x) => x.username)
          );

          cognitoUsers?.forEach((x) => {
            const index = employeesPayload.findIndex(
              (y) => y.username === x.username
            );
            employeesPayload[index].id = x.sub; // @TODO remove
            employeesPayload[index].sub = x.sub;
            employeeToBeCreated.push(employeesPayload[index]);
          });
        }

        const s3Promises = [];
        const resultKeys = [];
        const key = Date.now().toLocaleString();
        if (employeeToBeCreated.length) {
          s3Promises.push(
            uploadJsonAsXlsx(
              `jobs/bulk_signup/${jobData.jobId}/result/successful_${key}.xlsx`,
              employeeToBeCreated
            )
          );
          resultKeys.push("successful");
        }

        if (failedEmployeeArray.length) {
          s3Promises.push(
            uploadJsonAsXlsx(
              `jobs/bulk_signup/${jobData.jobId}/result/failed_${key}.xlsx`,
              failedEmployeeArray
            )
          );
          resultKeys.push("failed");
        }
        if (usersOnCognitoAndDB.length) {
          s3Promises.push(
            uploadJsonAsXlsx(
              `jobs/bulk_signup/${jobData.jobId}/result/existing_${key}.xlsx`,
              usersOnCognitoAndDB
            )
          );
          resultKeys.push("existing");
        }
        const s3Results = await Promise.all(s3Promises);
        s3Results.forEach((x, index) => {
          result[resultKeys[index]] = x;
        });

        const userInsertPromises = employeeToBeCreated.map((e) =>
          EmployeeModel.query(trx).insert({
            ...e,
          })
        );
        await Promise.all(userInsertPromises);
        const newManagers: IEmployee[] = await EmployeeModel.query(trx).whereIn(
          "email",
          newManagersEmails
        );
        const updatePromises = [];
        for (const m of newManagers) {
          const eez = employeeToBeCreated.filter(
            (x) => x.reportingManager === m.email
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
        await trx.commit();
      } catch (e) {
        errors.push({
          message: e.message,
        });
        await trx.rollback();
      }
    });
  } catch (e) {
    errors.push({ message: e.message });
  }
  try {
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
    } else {
      await JobsModel.update(
        { jobId: payload.jobId },
        {
          jobStatus: "SUCCESSFUL",
          result,
        }
      );
    }
  } catch (e) {
    console.log("[JobsModel] result not saved due to errors", e);
  }
  return formatJSONResponse({ result }, 200);
};

const deleteUsers = async (
  client: CognitoIdentityProviderClient,
  usernames: string[]
) => {
  const promises = usernames.map((username) => {
    const command = new AdminDeleteUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username,
    });
    return client.send(command);
  });

  try {
    const responses = await Promise.all(promises);
    console.log("Successfully deleted users:", responses);
  } catch (error) {
    console.error("Error deleting users:", error);
  }
};

const getUsers = async (
  client: CognitoIdentityProviderClient,
  usernames: string[]
): Promise<
  {
    username: string;
    sub: string;
  }[]
> => {
  try {
    const promises = usernames.map(async (username) => {
      const params: AdminGetUserCommandInput = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username,
      };
      const command = new AdminGetUserCommand(params);
      return client.send(command);
    });
    const users = await Promise.allSettled(promises);
    const usersMin = users
      .filter((x) => x.status === "fulfilled")
      .map((x) => {
        const subAttribute = x?.value?.UserAttributes.find(
          (attribute) => attribute.Name === "sub"
        );
        const sub = subAttribute ? subAttribute.Value : null;
        return { username: x?.value?.Username, sub };
      });
    return usersMin;
  } catch (err) {
    console.log(err);
  }
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

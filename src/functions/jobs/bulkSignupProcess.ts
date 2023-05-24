import "reflect-metadata";
import { CustomError } from "@helpers/custom-error";
// import JobsModel, { IJobs } from "@models/pending/[x]Jobs";
import {
  getS3BufferFromKey,
  fileExists,
  uploadContentToS3,
  uploadJsonAsXlsx,
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
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminGetUserCommandInput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { chunk } from "lodash";

const client: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
  {
    region: process.env.REGION,
  }
);

export const bulkImportUsersProcessHandler = async (jobData: IJobData) => {
  const errors = [];
  let result = {};
  console.log("[bulkImportUsersProcessHandler] jobData", jobData);
  try {
    // if (jobData.jobStatus === "SUCCESSFUL") {
    //   return formatJSONResponse({ message: "Job already completed" }, 200);
    // }
    const signupFile = await getS3BufferFromKey(jobData?.details?.fileKey);
    console.log("signupFile downloaded");
    interface ITmpEmployee {
      name: string;
      email: string;
      phone_number: string;
      team_id: string;
      reporting_manager: string;
      role: string;
    }

    const employeeFromSheet: ITmpEmployee[] = await importDataFromXlsx(
      signupFile
    );
    console.log("employeeFromSheet length", employeeFromSheet.length);
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
    console.log("joi validated");
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
        // @TODO FIX_TEAM_ID
        // teamId: x.team_id,
        addedBy: jobData.uploadedBy,
      });
    }

    const cognitoSignupResult = await insertIntoCognito(employeesPayload);
    console.log("cognitoSignupResult", cognitoSignupResult);
    const { s3Result, employeeToBeCreated } = await handleCognitoResponse(
      jobData.jobId,
      existingDbEmployees,
      employeesPayload,
      cognitoSignupResult
    );
    result = { ...result, ...s3Result };
    await docClient.getKnexClient().transaction(async (trx) => {
      try {
        const userInsertPromises = employeeToBeCreated.map((e) =>
          EmployeeModel.query(trx)
            .insert({
              ...e,
            })
            .onConflict("username")
            .ignore()
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
        /**
         * @NOTES
         * We can call delete users here, but let's say someone by mistake put an old and
         * very important account in sheet and transaction somehow crashes. that will
         * delete that important account as well. so we will not delete anything in cognito
         * unless specified with great great great care
         */
        await trx.rollback();
      }
    });
    await JobsModel.update(
      { jobId },
      {
        jobStatus: "SUCCESSFUL",
        result,
      }
    );
  } catch (e) {
    errors.push({ message: e.message });
  }
  try {
    if (errors.length) {
      try {
        await JobsModel.update(
          { jobId },
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
  } catch (e) {
    console.log("[JobsModel] result not saved due to errors", e);
  }
  return formatErrorResponse(errors);
};

const insertIntoCognito = async (employees: any[]) => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  console.log("[insertIntoCognito] userPoolId", userPoolId);
  const payloads = [];
  const password = "Password@123";

  const signupPromises = employees.map((employee) => {
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

  return Promise.allSettled(signupPromises);
};

const handleCognitoResponse = async (
  jobId: string,
  existingDbEmployees: IEmployee[],
  employeesPayload: any[],
  cognitoSignupResult: any[]
) => {
  const result = {};
  // run foreach on this to sepearte fullfilled and rejected
  const employeeToBeCreated: IEmployee[] = [];
  const failedEmployeeArray = [];
  let existingCognitoEmployees: IEmployee[] = [];
  cognitoSignupResult.forEach((r, index) => {
    if (r.status === "fulfilled") {
      const sub = r.value.User.Attributes.find((x) => x.Name === "sub").Value;
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
  const key = Date.now().toString();
  if (employeeToBeCreated.length) {
    s3Promises.push(
      uploadJsonAsXlsx(
        `jobs/bulk_signup/${jobId}/result/successful_${key}.xlsx`,
        employeeToBeCreated
      )
    );
    resultKeys.push("successful");
  }

  if (failedEmployeeArray.length) {
    s3Promises.push(
      uploadJsonAsXlsx(
        `jobs/bulk_signup/${jobId}/result/failed_${key}.xlsx`,
        failedEmployeeArray
      )
    );
    resultKeys.push("failed");
  }
  if (usersOnCognitoAndDB.length) {
    s3Promises.push(
      uploadJsonAsXlsx(
        `jobs/bulk_signup/${jobId}/result/existing_${key}.xlsx`,
        usersOnCognitoAndDB
      )
    );
    resultKeys.push("existing");
  }
  const s3Results = await Promise.all(s3Promises);
  s3Results.forEach((x, index) => {
    result[resultKeys[index]] = x;
  });

  console.log("[handleCognitoResponse]", result);
  return { s3Result: result, employeeToBeCreated };
};

/**
 * @deprecated
 * @param usernames
 */
const deleteUsers = async (usernames: string[]) => {
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

const importDataFromXlsxFile = (filePath: string) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  return jsonData;
};

const uploadSignupBulkJobHandler = async (event) => {
  const { employee, body } = event;
  const payload = JSON.parse(body);
  await fileExists(payload.filePath);
  const employeeFromSheet = importDataFromXlsxFile(payload.filePath);

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

  const chunks = chunk(employeeFromSheet, 100);
  const jobPayload = chunks.map((x) => {
    return {
      jobId: randomUUID(),
      data: x,
    };
  });

  const promises = jobPayload.map((x) =>
    uploadContentToS3(
      `jobs/bulk_signup/${x.jobId}/data.xlsx`,
      jsonToXlsxBuffer(x.data)
    )
  );
  const details = await Promise.all(promises);

  const jobsPayload = details.map(
    (x, index) =>
      new JobsModel({
        jobId: jobPayload[index].jobId,
        uploadedBy: employee.sub,
        jobType: "BULK_SIGNUP",
        details: x,
        jobStatus: "PENDING",
      })
  );
  const jobs = await JobsModel.batchPut(jobsPayload);
  return formatJSONResponse({ jobs }, 201);
};

const jsonToXlsxBuffer = (data) => {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return xlsx.write(workbook, { type: "buffer" });
};

export const uploadSignupBulkJob = checkRolePermission(
  uploadSignupBulkJobHandler,
  "COMPANY_READ"
);

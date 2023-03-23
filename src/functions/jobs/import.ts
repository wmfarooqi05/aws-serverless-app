import * as xlsx from "xlsx";
import { formatJSONResponse } from "@libs/api-gateway";
import {
  IAddress,
  ICompany,
  IConcernedPerson,
} from "@models/interfaces/Company";
import { canadaData, cities, ICityData } from "./canadaData";
import { randomUUID } from "crypto";
import moment from "moment-timezone";
import jwtMiddlewareWrapper from "@middlewares/jwtMiddleware";
import CompanyModel from "@models/Company";
import { DatabaseService } from "@libs/database/database-service-objection";
import { uploadToS3 } from "./upload";
import { container } from "tsyringe";
import JobsResultsModel from "@models/JobsResult";
import { CustomError } from "@helpers/custom-error";

// @TODO add service
const importDataHandler = async (event) => {
  try {
    const employeeId = event.employee?.sub;
    const payload = JSON.parse(event.body);
    const filePath: string = payload.filePath;
    const type: string = filePath?.split(".")[filePath.split(".")?.length - 1];
    if (!filePath) {
      throw new CustomError("Filepath not provided", 400);
    } else if (type !== "xlsx") {
      throw new CustomError("Only .xlsx files are supported", 400);
    } else if (!employeeId) {
      throw new CustomError("Employee Id not found", 400);
    }

    await container.resolve(DatabaseService);
    const importDataFromXlsx = async (filePath: string) => {
      const workbook = await xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      return jsonData;
    };

    const data: any = await importDataFromXlsx(filePath);
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

    return formatJSONResponse({ message: "Added data successfully" }, 200);
  } catch (e) {
    return formatJSONResponse(
      { message: "Error adding data", details: e.message },
      500
    );
  }
};

interface importType {
  [x: string]: string;
}

const transformDataHelper = async (
  employeeId: string,
  transformData: importType[]
) => {
  // @Note not adding extra use cases without discussion
  const transformedData = [];
  transformData?.forEach((record) => {
    const concernedPersons: IConcernedPerson[] =
      createConcernedPersonHelper(record);
    record["Remarks"] = "This is first remark";
    const notes =
      record["Remarks"]?.trim().length > 0
        ? [
            {
              id: randomUUID(),
              notesText: record["Remarks"],
              addedBy: employeeId,
              isEdited: false,
              updatedAt: moment().utc().format(),
            },
          ]
        : [];

    const item = {
      companyName: record["Company Name"] || "not found",
      addresses:
        record["Address"]?.trim().length > 0
          ? [createAddress(record["Address"])]
          : [],
      concernedPersons,
      createdBy: employeeId,
      notes,
    };
    transformedData.push(item);
  });
  return transformedData;
};

function findDataWithCity(address: string | null): ICityData | null {
  let foundCity = cities.find((city) => address.includes(city));
  return foundCity ? canadaData[foundCity] : null;
}

function createAddress(address: string | null): IAddress {
  if (!address) {
    return null;
  }
  const data = findDataWithCity(address);
  return {
    address,
    city: data?.city || "not found",
    country: "Canada",
    state: data?.state || "not found",
    title: address,
    postalCode: data?.zipcode || "not found",
  };
}

function createConcernedPersonHelper(record: importType): IConcernedPerson[] {
  const persons: IConcernedPerson[] = [];
  const names = record["HR/PLANT MANAGER NAME"]
    ?.replace("\\n", "/")
    ?.split("/");
  names?.forEach((personName) => {
    const time = moment().utc().format();
    const person: IConcernedPerson = {
      id: randomUUID(),
      name: personName,
      phoneNumbers: record["Phone"]?.replace("\\n", " ")?.split(/\/|,/),
      emails: record["Email"]?.replace("\\n", " ")?.split(/\/|,|\n|[ ]+/),
      designation: personName?.match(/\(([^)]+)\)/)?.[0] || "not found",
      timezone: process.env.CANADA_DEFAULT_TIMEZONE || "America/Toronto",
      createdAt: time,
      updatedAt: time,
    };
    persons.push(person);
  });
  return persons;
}
// const jsObject = [];
// canadaData.forEach((item, index) => {
//   jsObject.push(item["Town/City"]);
// });
// return formatJSONResponse(jsObject, 200);

const writeDataToDB = async (data: ICompany[]) => {
  let report = {};
  let index = 0;
  try {
    const chunkSize = 10;
    const chunkedArray = chunkArray(data, chunkSize);
    for (let i = 0; i < chunkedArray.length; i++) {
      try {
        await container.resolve(DatabaseService);
        const resp = await CompanyModel.query().insert(chunkedArray[i]);
        report[index++] = resp;
      } catch (e) {
        console.log('error', e);
        let obj = e;
        obj._stack = e.stack;
        report[index++] = obj;
      }
    }
  } catch (e) {
    let obj = e;
    obj._stack = e.stack;
    report[index++] = obj;
  }
  return report;
};

const chunkArray = (arr: ICompany[], chunkSize: number) => {
  const result: ICompany[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }
  return result;
};

export const importData = jwtMiddlewareWrapper(importDataHandler);

const importData2 = async (transformData: importType[]) => {
  const city = [];
  const allData = {};
  transformData?.forEach((item) => {
    city.push(item["city"]);
    const item2 = {
      city: item["city"],
      state: item["state"],
      zipcode: item["zipCode"],
    };
    allData[item["city"]] = item2;
  });
  return formatJSONResponse(allData, 200);
};

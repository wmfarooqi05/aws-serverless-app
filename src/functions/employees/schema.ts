import { getPaginatedJoiKeys } from "@common/schema";
import EmployeeModel from "@models/Employees";
import * as Joi from "joi";

const schemaKeys = Object.keys(EmployeeModel?.jsonSchema?.properties || {});

export const validateGetEmployees = async (obj: any) => {
  await Joi.object({
    // Add employee related filter
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
    returningFields: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
  });
};

export const validateGetEmployeesSummary = async (obj: any) => {
  await Joi.object({
    minCompanyCount: Joi.number().min(0),
    maxCompanyCount: Joi.number().min(0),
  })
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(obj, {
      abortEarly: true,
    });
};

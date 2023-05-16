import * as Joi from "joi";
import {
  COMPANY_STAGES,
  COMPANY_PRIORITY,
  COMPANY_STATUS,
} from "@models/interfaces/Company";
import { getPaginatedJoiKeys } from "src/common/schema";
import CompanyModel from "@models/Company";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import EmployeeCompanyInteractionsModel from "@models/EmployeeCompanyInteractions";

const schemaKeys = Object.keys(CompanyModel.jsonSchema.properties);
const combinedKeys = schemaKeys.concat(
  EmployeeCompanyInteractionsModel.validSchemaKeys
);

const AddressJoi = Joi.array().items(
  Joi.object({
    title: Joi.string(),
    address: Joi.string().required(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    // fix this
    postalCode: Joi.alternatives(Joi.number(), Joi.string()), //.min(10000).max(99999),
  })
);

export const validateGetCompanies = async (obj: any) => {
  await Joi.object({
    priority: Joi.array().items(
      Joi.string().valid(...Object.values(COMPANY_PRIORITY))
    ),
    status: Joi.array().items(
      Joi.string().valid(...Object.values(COMPANY_STATUS))
    ),
    stage: Joi.array().items(
      Joi.string().valid(...Object.values(COMPANY_STAGES))
    ),
  })
    .concat(getPaginatedJoiKeys(combinedKeys))
    .validateAsync(
      {
        ...obj,
        priority: obj?.priority?.split(","),
        status: obj?.status?.split(","),
        stage: obj?.stage?.split(","),
      },
      {
        abortEarly: true,
      }
    );
};

export const validateCreateCompany = async (obj: any) => {
  await Joi.object({
    companyName: Joi.string(),
    addresses: AddressJoi,
    createdBy: Joi.string().guid().required(),
  }).validateAsync(obj, {
    abortEarly: true,
    // @TODO cleanup api update
  });
};

export const validateUpdateCompanies = async (id: string, obj: any) => {
  await Joi.object({
    id: Joi.string().guid(),
    companyName: Joi.string(),
    addresses: AddressJoi,
    tags: Joi.array().items(Joi.string()),
    details: Joi.object(),
  }).validateAsync(
    { ...obj, id },
    {
      abortEarly: true,
    }
  );
};

export const validateUpdateCompanyInteractions = async (
  obj,
  employeeId,
  companyId
) => {
  await Joi.object({
    companyId: Joi.string().guid().required(),
    employeeId: Joi.string().guid().required(),
    priority: Joi.string().valid(...Object.values(COMPANY_PRIORITY)),
    status: Joi.string().valid(...Object.values(COMPANY_STATUS)),
  }).validateAsync(
    { ...obj, employeeId, companyId },
    {
      abortEarly: true,
    }
  );
};

export const validateUpdateCompaniesAssignedEmployee = async (
  assignedBy: string,
  payload: any
) => {
  await Joi.object({
    assignedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid().allow(null),
    companyIds: Joi.array().items(Joi.string().guid()).required(),
  }).validateAsync(
    { ...payload, assignedBy },
    {
      abortEarly: true,
    }
  );
};

export const validateUpdateCompanyAssignedEmployee = async (
  companyId: string,
  assignedBy: string,
  payload: any
) => {
  await Joi.object({
    assignedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid().allow(null),
    companyId: Joi.string().guid().required(),
  }).validateAsync(
    { ...payload, assignedBy, companyId },
    {
      abortEarly: true,
    }
  );
};

// Notes
export const validateGetNotes = async (
  employeeId: string,
  companyId: string
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
  }).validateAsync(
    { companyId, employeeId },
    {
      abortEarly: true,
    }
  );
};
export const validateAddNotes = async (
  addedBy: string,
  companyId: string,
  payload: any
) => {
  await Joi.object({
    addedBy: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    notesText: Joi.string().required(),
  }).validateAsync(
    { ...payload, companyId, addedBy },
    {
      abortEarly: true,
    }
  );
};

export const validateUpdateNotes = async (
  addedBy: string,
  companyId: string,
  notesId: string,
  body: any
) => {
  await Joi.object({
    addedBy: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    notesId: Joi.string().guid().required(),
    notesText: Joi.string().required(),
  }).validateAsync(
    { ...body, companyId, addedBy, notesId },
    {
      abortEarly: true,
    }
  );
};

export const validateDeleteNotes = async (obj) => {
  return Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    notesId: Joi.string().guid().required(),
  }).validateAsync(obj);
};

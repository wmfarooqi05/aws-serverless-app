import * as Joi from "joi";
import { COMPANY_STAGES, PRIORITY, TASK_STATUS } from "@models/Company";
import { getPaginatedJoiKeys } from "src/common/schema";
import CompanyModel from "@models/Company";

const schemaKeys = Object.keys(CompanyModel.jsonSchema.properties);

const AddressJoi = Joi.array().items(
  Joi.object({
    title: Joi.string(),
    address: Joi.string().required(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    postalCode: Joi.number(), //.min(10000).max(99999),
  })
);

export const validateGetCompanies = async (obj: any) => {
  await Joi.object({
    // @TODO replace with paginated schema
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
    returningFields: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
  });
};

export const validateCreateCompany = async (obj: any) => {
  await Joi.object({
    companyName: Joi.string(),
    addresses: AddressJoi,
    concernedPersons: Joi.array().items(
      Joi.object()
        .keys({
          name: Joi.string().required(),
          designation: Joi.string().required(),
          phoneNumbers: Joi.array().items(Joi.string()),
          emails: Joi.array().items(Joi.string().email()),
        })
        .or("emails", "phoneNumbers")
    ),
    priority: Joi.string().valid(...Object.values(PRIORITY)),
    taskStatus: Joi.string().valid(...Object.values(TASK_STATUS)),
    stage: Joi.string().valid(...Object.values(COMPANY_STAGES)),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false, // @TODO cleanup api update
  });
};

export const validateUpdateCompanies = async (id: string, obj: any) => {
  await Joi.object({
    id: Joi.string().guid(),
    companyName: Joi.string(),
    addresses: AddressJoi,
    priority: Joi.string().valid(...Object.values(PRIORITY)),
    taskStatus: Joi.string().valid(...Object.values(TASK_STATUS)),
    stage: Joi.string().valid(...Object.values(COMPANY_STAGES)),
  }).validateAsync(
    { ...obj, id },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateUpdateCompanyAssignedUser = async (
  companyId: string,
  assignedBy: string,
  payload: any
) => {
  await Joi.object({
    assignedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid(),
    companyId: Joi.string().guid().required(),
    comments: Joi.string(),
  }).validateAsync(
    { ...payload, assignedBy, companyId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateCreateConcernedPerson = async (
  companyId: string,
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    name: Joi.string().required(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  })
    .or("phoneNumbers", "emails")
    .validateAsync(
      { ...payload, companyId, employeeId },
      {
        abortEarly: true,
        allowUnknown: false,
      }
    );
};

export const validateUpdateConcernedPerson = async (
  employeeId: string,
  companyId: string,
  concernedPersonId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    concernedPersonId: Joi.string().guid().required(),
    name: Joi.string(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  }).validateAsync(
    { ...payload, companyId, employeeId, concernedPersonId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

// Notes
export const validateGetNotes = async (userId: string, companyId: string) => {
  await Joi.object({
    userId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
  }).validateAsync(
    { companyId, userId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};
export const validateAddNotes = async (addedBy: string, companyId: string, payload: any) => {
  await Joi.object({
    addedBy: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    notesText: Joi.string().required(),
  }).validateAsync(
    { ...payload, companyId, addedBy },
    {
      abortEarly: true,
      allowUnknown: false,
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
    { ...body, companyId, addedBy, notesId, },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

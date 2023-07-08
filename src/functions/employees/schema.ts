import { getPaginatedJoiKeys } from "@common/schema";
import EmployeeModel from "@models/Employees";
import { DATE_FORMATS, GenderArray } from "@models/interfaces/Employees";
import * as Joi from "joi";
import moment from "moment-timezone";

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

export const validateUpdateProfile = async (obj: any) => {
  await Joi.object({
    name: Joi.string(),
    avatar: Joi.string().uri(),
    gender: Joi.string().valid(...GenderArray),
    addresses: Joi.array().items({
      title: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string(),
      country: Joi.string(),
      postalCode: Joi.string(),
      address: Joi.string().required(),
      defaultAddress: Joi.bool().required(),
    }),
    birthdate: Joi.string().isoDate(),
    secondaryPhoneNumbers: Joi.array().items({
      title: Joi.string().required(),
      phoneNumber: Joi.string(),
    }),
    timezone: Joi.string().valid(...moment.tz.names()),
    dateFormat: Joi.string()
      .valid(...DATE_FORMATS)
  }).validateAsync(obj);
};

import * as Joi from "joi";
import {
  ACTIVITY_TYPE,
  ACTIVITY_STATUS_SHORT,
} from "src/models/interfaces/Activity";
import ActivityModel from "src/models/Activity";
import { getPaginatedJoiKeys } from "src/common/schema";

const schemaKeys = Object.keys(ActivityModel.jsonSchema.properties);

export const validateGetActivitiesByCompany = async (
  companyId: string,
  obj: any
) => {
  await Joi.object({
    companyId: Joi.string().guid().required(),
    type: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_TYPE))
    ),
    // This is get all api, so we will not filter unless status is passed
    status: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_STATUS_SHORT))
    ),
  })
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(
      { ...obj, companyId },
      {
        abortEarly: true,
        allowUnknown: false,
      }
    );
};

export const validateGetActivities = async (obj: any) => {
  await Joi.object({
    type: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_TYPE))
    ),
    // This is get all api, so we will not filter unless status is passed
    status: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_STATUS_SHORT))
    ),
  })
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(obj, {
      abortEarly: true,
      allowUnknown: false,
    });
};

export const validateGetMyActivities = async (createdBy: string, obj: any) => {
  await Joi.object({
    createdBy: Joi.string().guid().required(),
    type: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_TYPE))
    ),
    // This is get all api, so we will not filter unless status is passed
    status: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_STATUS_SHORT))
    ),
  })
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(
      { ...obj, createdBy },
      {
        abortEarly: true,
        allowUnknown: false,
      }
    );
};

// @TODO update validations
export const validateCreateActivity = async (
  createdBy: string,
  payload: any
) => {
  await Joi.object({
    summary: Joi.string(), // in case of email, it will be null
    companyId: Joi.string().guid().required(),
    createdBy: Joi.string().guid().required(),
    details: Joi.object(), // add 4 validations
    concernedPersonDetails: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      designation: Joi.string().required(),
    }).required(),
    activityType: Joi.string().valid(...Object.values(ACTIVITY_TYPE)),
    createdAt: Joi.string().isoDate(),
    updatedAt: Joi.string().isoDate(),
  }).validateAsync(
    { ...payload, createdBy },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

// @TODO update validations
export const validateUpdateActivity = async (
  createdBy: string,
  activityId: string,
  payload: any
) => {
  await Joi.object({
    summary: Joi.string(), // in case of email, it will be null
    statusShort: Joi.string().guid(),
  })
    .min(1)
    .validateAsync(payload, {
      abortEarly: true,
      allowUnknown: false,
    });

  await Joi.object({
    activityId: Joi.string().guid().required(),
    createdBy: Joi.string().guid().required(),
  }).validateAsync(
    { createdBy, activityId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateRemarks = async (
  employeeId: string,
  activityId: string,
  payload: any
) => {
  await Joi.object({
    companyId: Joi.string().guid().required(),
    activityId: Joi.string().guid().required(),
    remarksText: Joi.string().required().min(10).max(1500),
    employeeId: Joi.string().guid().required(),
    createdAt: Joi.string().isoDate(),
    updatedAt: Joi.string().isoDate(),
  }).validateAsync(
    { ...payload, employeeId, activityId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateUpdateRemarks = async (
  employeeId: string,
  activityId: string,
  remarksId: string,
  payload: any
) => {
  await Joi.object({
    companyId: Joi.string().guid().required(),
    activityId: Joi.string().guid().required(),
    remarksId: Joi.string().guid().required(),
    remarksText: Joi.string().required().min(10).max(1500),
    employeeId: Joi.string().guid().required(),
  }).validateAsync(
    { ...payload, employeeId, activityId, remarksId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

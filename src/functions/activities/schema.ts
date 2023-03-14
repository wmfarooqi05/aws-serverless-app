import * as Joi from "joi";
import {
  ACTIVITY_TYPE,
  ACTIVITY_STATUS_SHORT,
  IActivity,
  IACTIVITY_DETAILS,
  IPHONE_DETAILS,
  IEMAIL_DETAILS,
  IMEETING_DETAILS,
  ITASK_DETAILS,
} from "src/models/interfaces/Activity";
import ActivityModel from "src/models/Activity";
import { getPaginatedJoiKeys } from "src/common/schema";
import { IUserJwt } from "@models/interfaces/User";
import moment from "moment-timezone";

const schemaKeys = Object.keys(ActivityModel?.jsonSchema?.properties || {});

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
      }
    );
};

// @TODO update validations
export const validateCreateActivity = async (
  createdBy: string,
  payload: IActivity
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
    // @TODO add email type validation
    createdAt: Joi.string().isoDate(),
    updatedAt: Joi.string().isoDate(),
  }).validateAsync(
    { ...payload, createdBy },
    {
      abortEarly: true,
    }
  );
  await validateDetailPayload(payload.activityType, payload.details);
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
    });

  await Joi.object({
    activityId: Joi.string().guid().required(),
    createdBy: Joi.string().guid().required(),
  }).validateAsync(
    { createdBy, activityId },
    {
      abortEarly: true,
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
    }
  );
};

const validateDetailPayload = async (
  activityType: ACTIVITY_TYPE,
  details: IACTIVITY_DETAILS
) => {
  switch (activityType) {
    case ACTIVITY_TYPE.CALL:
      await validateCallDetails(details as IPHONE_DETAILS);
      break;
    case ACTIVITY_TYPE.EMAIL:
      await validateEmailDetails(details as IEMAIL_DETAILS);
      break;
    case ACTIVITY_TYPE.MEETING:
      await validateMeetingDetails(details as IMEETING_DETAILS);
      break;
    case ACTIVITY_TYPE.TASK:
      await validateTaskDetails(details as ITASK_DETAILS);
      break;
  }
};

const validateCallDetails = async (details: IPHONE_DETAILS) => {
  console.log(details);
};

const validateEmailDetails = async (details: IEMAIL_DETAILS) => {
  await Joi.object({
    to: Joi.array().items({
      name: Joi.string(),
      email: Joi.string().email().required(),
    }),
    subject: Joi.string().required(),
    date: Joi.string().isoDate().required(), // must in case of is scheduled, decide for other cases
    body: Joi.string().required(),
    isScheduled: Joi.boolean(),
    timezone: Joi.string().required(),
  }).validateAsync(details);
};

const validateMeetingDetails = async (details: IMEETING_DETAILS) => {
  await Joi.object({
    summary: Joi.string().required(),
    calendarId: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string(),
    createVideoLink: Joi.boolean().required(),
    startDateTime: Joi.string().required(),
    endDateTime: Joi.string().required(),
    timezone: Joi.string()
      .required()
      .valid(...moment.tz.names()),
    sendUpdates: Joi.string().valid(...["all", "externalOnly", "none"]),
    reminders: Joi.object({
      useDefault: Joi.boolean(),
      overrides: Joi.array()
        .items({
          method: Joi.string()
            .required()
            .invalid(...["email", "popup"]),
          minutes: Joi.number().required().min(1),
        })
        .optional(),
    }),
    attendees: Joi.array().items({
      email: Joi.string().required(),
      displayName: Joi.string(),
    }),
  }).validateAsync(details);
};

const validateTaskDetails = async (details: ITASK_DETAILS) => {
  console.log(details);
};

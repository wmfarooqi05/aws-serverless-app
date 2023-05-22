import Joi from "joi";
import {
  ACTIVITY_TYPE,
  IACTIVITY_DETAILS,
  ICALL_DETAILS,
  IEMAIL_DETAILS,
  IMEETING_DETAILS,
  ITASK_DETAILS,
} from "src/models/interfaces/Activity";
import moment from "moment-timezone";
import EmailListModel from "@models/EmailLists";
import { getPaginatedJoiKeys } from "@common/schema";

const schemaKeys = Object.keys(EmailListModel.jsonSchema.properties);

export const validateGetEmailLists = async (obj: any) => {
  await Joi.object()
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(obj, {
      abortEarly: true,
    });
};

export const validateAddEmailList = async (
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    name: Joi.string().required().min(3),
    teamId: Joi.string().guid().required(),
    updatedBy: Joi.string().guid().required(),
  }).validateAsync(
    { ...payload, updatedBy: employeeId },
    {
      abortEarly: true,
    }
  );
};

export const validateUpdateEmailList = async (
  employeeId: string,
  emailListId: string,
  payload: any
) => {
  await Joi.object({
    name: Joi.string().min(3),
    emailListId: Joi.string().guid().required(),
    teamId: Joi.string().guid(),
    updatedBy: Joi.string().guid().required(),
  }).validateAsync(
    { ...payload, updatedBy: employeeId, emailListId },
    {
      abortEarly: true,
    }
  );
};

export const validateDeleteEmailList = async (
  employeeId: string,
  emailListId: string
) => {
  await Joi.object({
    emailListId: Joi.string().guid().required(),
    updatedBy: Joi.string().guid().required(),
  }).validateAsync(
    { updatedBy: employeeId, emailListId },
    {
      abortEarly: true,
    }
  );
};

const validateCallDetails = async (details: ICALL_DETAILS) => {
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
    isDraft: Joi.boolean(),
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

export const validateContactEmailToEmailList = async (
  employeeId,
  emailListId,
  contactEmailId
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    emailListId: Joi.string().guid().required(),
    contactEmailId: Joi.string().guid().required(),
  }).validateAsync({ employeeId, emailListId, contactEmailId });
};

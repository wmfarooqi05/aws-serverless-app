import Joi from "joi";
import {
  ACTIVITY_TYPE,
  IACTIVITY_DETAILS,
  IPHONE_DETAILS,
  IEMAIL_DETAILS,
  IMEETING_DETAILS,
  ITASK_DETAILS,
} from "src/models/interfaces/Activity";
import moment from "moment-timezone";

export const validateRemarks = async (
  employeeId: string,
  activityId: string,
  payload: any
) => {
  await Joi.object({
    companyId: Joi.string().guid(), // @TODO remove in future
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
    companyId: Joi.string().guid(),
    activityId: Joi.string().guid().required(),
    remarksId: Joi.string().guid().required(),
    remarksText: Joi.string().required().min(10).max(1500),
    employeeId: Joi.string().guid().required(),
    dueDate: Joi.string(),
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

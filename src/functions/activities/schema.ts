import Joi from "joi";
import {
  ACTIVITY_TYPE,
  ACTIVITY_STATUS,
  IActivity,
  IACTIVITY_DETAILS,
  ICALL_DETAILS,
  IEMAIL_DETAILS,
  IMEETING_DETAILS,
  ITASK_DETAILS,
  ACTIVITY_PRIORITY,
  CALL_TYPE,
} from "src/models/interfaces/Activity";
import ActivityModel from "src/models/Activity";
import { getPaginatedJoiKeys } from "src/common/schema";
import moment from "moment-timezone";

const schemaKeys = Object.keys(ActivityModel?.jsonSchema?.properties || {});

export const validateGetActivitiesByCompany = async (
  employeeId: string,
  obj: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
  })
    .concat(getActivitiesJoiKey())
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(
      { ...getActivityJoiObject(obj), employeeId },
      {
        abortEarly: true,
      }
    );
};

const getActivitiesJoiKey = (): Joi.ObjectSchema<any> => {
  return Joi.object({
    type: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_TYPE))
    ),
    // This is get all api, so we will not filter unless status is passed
    status: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_STATUS))
    ),
    dateFrom: Joi.string().isoDate(),
    dateTo: Joi.string().isoDate(),
    tags: Joi.array().items(Joi.string()),
  });
};

const getActivityJoiObject = (obj: any) => {
  const a = {
    ...obj,
    status: obj?.status?.split(","),
    type: obj?.type?.split(","),
    returningFields: obj?.returningFields?.split(","),
    tags: obj?.tags?.split(","),
  };
  return a;
};

export const validateGetActivities = async (obj: any) => {
  await Joi.object({
    createdByIds: Joi.array().items(Joi.string().guid()),
  })
    .concat(getActivitiesJoiKey())
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(getActivityJoiObject(obj), {
      abortEarly: true,
    });
};

export const validateGetMyActivities = async (createdBy: string, obj: any) => {
  await Joi.object({
    createdBy: Joi.string().guid().required(),
  })
    .concat(getActivitiesJoiKey())
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(
      {
        ...getActivityJoiObject(obj),
        ...obj,
        createdBy,
        status: obj?.status?.split(","),
        type: obj?.type?.split(","),
        returningFields: obj?.type?.split(","),
        tags: obj?.tags?.split(","),
      },
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
    title: Joi.string(), //.required(),
    summary: Joi.string(), // in case of email, it will be null
    companyId: Joi.string().guid().required(),
    createdBy: Joi.string().guid().required(),
    details: Joi.object(), // add 4 validations
    contactDetails: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      designation: Joi.string().required(),
    }).required(),
    isScheduled: Joi.boolean(),
    activityType: Joi.string().valid(...Object.values(ACTIVITY_TYPE)),
    status: Joi.string().valid(...Object.values(ACTIVITY_STATUS)),
    priority: Joi.string().valid(...Object.values(ACTIVITY_PRIORITY)),
    // @TODO add email type validation
    dueDate: Joi.string().isoDate(),
    createdAt: Joi.string().isoDate(),
    updatedAt: Joi.string().isoDate(),
    reminders: Joi.object({
      useDefault: Joi.boolean(),//.required(),
      overrides: Joi.array().items(
        Joi.object({
          method: Joi.string().valid("email", "popup").required(),
          minutes: Joi.number().integer().positive().required(),
        })
      ),
    }).xor("useDefault", "overrides"),
  }).validateAsync(
    { ...payload, createdBy },
    {
      abortEarly: true,
      allowUnknown: true,
    }
  );
  await validateDetailPayload(payload.activityType, payload.details);
};

// @TODO update validations
export const validateUpdateActivity = async (
  employeeId: string,
  activityId: string,
  payload: any
) => {
  await Joi.object({
    activityId: Joi.string().guid().required(),
    employeeId: Joi.string().guid().required(),

    // payload
    summary: Joi.string(), // in case of email, it will be null
    tags: Joi.array().items(Joi.string()),
    priority: Joi.string().valid(...Object.keys(ACTIVITY_PRIORITY)),
    dueDate: Joi.date(),//.greater("now"), // we will handle it with moment
    details: Joi.object(),
    title: Joi.string(),

    reminders: Joi.object({
      useDefault: Joi.boolean(),
      overrides: Joi.array().items(
        Joi.object({
          method: Joi.string().valid("email", "popup").required(),
          minutes: Joi.number().integer().positive().required(),
        })
      ),
    }).xor("useDefault", "overrides"),
  })
    .min(1)
    .validateAsync(
      { ...payload, employeeId, activityId },
      {
        abortEarly: true,
      }
    );
};

export const validateUpdateStatus = async (
  employeeId: string,
  activityId: string,
  status: string
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    activityId: Joi.string().guid().required(),
    status: Joi.string().valid(...Object.keys(ACTIVITY_STATUS)),
  }).validateAsync({ employeeId, activityId, status });
};

const validateDetailPayload = async (
  activityType: ACTIVITY_TYPE,
  details: IACTIVITY_DETAILS
) => {
  if (activityType === ACTIVITY_TYPE.CALL) {
    await validateCallDetails(details as ICALL_DETAILS);
  } else if (activityType === ACTIVITY_TYPE.EMAIL) {
    await validateEmailDetails(details as IEMAIL_DETAILS);
  } else if (activityType === ACTIVITY_TYPE.MEETING) {
    await validateMeetingDetails(details as IMEETING_DETAILS);
  } else if (activityType === ACTIVITY_TYPE.TASK) {
    await validateTaskDetails(details as ITASK_DETAILS);
  }
  console.log("validateDetailPayload");
};

const validateCallDetails = async (details: ICALL_DETAILS = {}) => {
  await Joi.object({
    callType: Joi.when("isScheduled", {
      is: true,
      then: Joi.string().valid(CALL_TYPE.OUTGOING).messages({
        "*": "Call can only be Outgoing when isScheduled is true",
      }),
      otherwise: Joi.string().valid(CALL_TYPE.INCOMING, CALL_TYPE.MISSED),
    }),
    callDuration: Joi.when("callType", {
      is: CALL_TYPE.MISSED,
      then: Joi.number().min(0).allow(null),
      otherwise: Joi.when("isScheduled", {
        is: true,
        then: Joi.number().min(0).allow(null),
        otherwise: Joi.number().min(0).required(),
      }),
    }),
    phoneNumber: Joi.string().required(),
    date: Joi.date().required(),
    callAgenda: Joi.when("callType", {
      is: CALL_TYPE.MISSED,
      then: Joi.string().allow(null),
      otherwise: Joi.string().required(),
    }),

    callResult: Joi.when("callType", {
      is: CALL_TYPE.MISSED,
      then: Joi.string().allow(null),
      otherwise: Joi.when("isScheduled", {
        is: true,
        then: Joi.string().allow(null),
        otherwise: Joi.string().required(),
      }),
    }),
    description: Joi.when("callType", {
      is: CALL_TYPE.MISSED,
      then: Joi.string().allow(null),
      otherwise: Joi.string().required(),
    }),
    callStartTime: Joi.string().required(),
    callEndTime: Joi.when("callType", {
      is: CALL_TYPE.MISSED,
      then: Joi.string().allow(null),
      otherwise: Joi.when("isScheduled", {
        is: true,
        then: Joi.string().allow(null),
        otherwise: Joi.string().required(),
      }),
    }),
    isScheduled: Joi.boolean().required(),
  }).validateAsync(details);
};

const validateEmailDetails = async (details: IEMAIL_DETAILS = {}) => {
  await Joi.object({
    to: Joi.array().items({
      name: Joi.string(),
      email: Joi.string().email().required(),
    }),
    subject: Joi.string().required(),
    date: Joi.string().isoDate().required(), // must in case of is scheduled, decide for other cases
    body: Joi.string().required(),
    isDraft: Joi.boolean(),
    timezone: Joi.string()
      .required()
      .valid(...moment.tz.names()),
  }).validateAsync(details);
};

const validateMeetingDetails = async (details: IMEETING_DETAILS = {}) => {
  await Joi.object({
    summary: Joi.string().required(),
    calendarId: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string(),
    createVideoLink: Joi.boolean().required(),
    startDateTime: Joi.date().greater("now").required(),
    endDateTime: Joi.date().greater("now").required(),
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

const validateTaskDetails = async (details: ITASK_DETAILS = {}) => {
  await Joi.object({
    status: Joi.string(),
    title: Joi.string().required(),
    summary: Joi.string(),
    description: Joi.string(),
    isScheduled: Joi.boolean().required(),
  }).validateAsync(details);
  console.log("validateTaskDetails");
};

const getStaleActivities = (): Joi.ObjectSchema => {
  return Joi.object({
    daysAgo: Joi.number(),
    statuses: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_STATUS))
    ),
    priorities: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_PRIORITY))
    ),
    activityTypes: Joi.array().items(
      Joi.string().valid(...Object.values(ACTIVITY_TYPE))
    ),
  }).concat(getPaginatedJoiKeys(schemaKeys));
};

export const validateGetMyStaleActivities = (payload) => {
  return Joi.object()
    .concat(getStaleActivities())
    .validateAsync({
      ...payload,
      statuses: payload?.statuses?.split(","),
      priorities: payload?.priorities?.split(","),
      activityTypes: payload?.activityTypes?.split(","),
    });
};

export const validateGetEmployeeStaleActivities = (payload) => {
  return Joi.object({
    createdByIds: Joi.array().items(Joi.string().guid()),
  })
    .concat(getStaleActivities())
    .validateAsync({
      ...payload,
      statuses: payload?.statuses?.split(","),
      priorities: payload?.priorities?.split(","),
      activityTypes: payload?.activityTypes?.split(","),
      createdByIds: payload?.createdByIds?.split(","),
    });
};

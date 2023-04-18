import { getPaginatedJoiKeys } from "@common/schema";
import NotificationModel from "@models/Notification";
import * as Joi from "joi";

const schemaKeys = Object.keys(NotificationModel.jsonSchema.properties);

export const validateGetNotifications = async (obj: any = {}) => {
  await Joi.object({
    readStatus: Joi.boolean(),
  })
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(obj, {
      abortEarly: true,
    });
};

export const validateCreateNotification = async (obj: any) => {
  await Joi.object({
    notificationName: Joi.string(),
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
  }).validateAsync(obj, {
    abortEarly: true,
    // @TODO cleanup api update
  });
};

export const validateUpdateNotificationsReadStatus = async (obj: any) => {
  await Joi.object({
    ids: Joi.array().items(Joi.string().guid().required()),
    status: Joi.boolean().required(),
  }).validateAsync(obj, {
    abortEarly: true,
  });
};

export const validateUpdateNotificationAssignedEmployee = async (
  notificationId: string,
  assignedBy: string,
  payload: any
) => {
  await Joi.object({
    assignedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid(),
    notificationId: Joi.string().guid().required(),
    comments: Joi.string(),
  }).validateAsync(
    { ...payload, assignedBy, notificationId },
    {
      abortEarly: true,
    }
  );
};

export const validateCreateConcernedPerson = async (
  notificationId: string,
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    notificationId: Joi.string().guid().required(),
    name: Joi.string().required(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  })
    .or("phoneNumbers", "emails")
    .validateAsync(
      { ...payload, notificationId, employeeId },
      {
        abortEarly: true,
      }
    );
};

export const validateUpdateConcernedPerson = async (
  employeeId: string,
  notificationId: string,
  concernedPersonId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    notificationId: Joi.string().guid().required(),
    concernedPersonId: Joi.string().guid().required(),
    name: Joi.string(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  }).validateAsync(
    { ...payload, notificationId, employeeId, concernedPersonId },
    {
      abortEarly: true,
    }
  );
};

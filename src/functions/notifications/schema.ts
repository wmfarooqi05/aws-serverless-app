import * as Joi from "joi";

export const validateGetNotifications = async (obj: any) => {
  await Joi.object({
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
    returningFields: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
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
    allowUnknown: false, // @TODO cleanup api update
  });
};

export const validateUpdateNotifications = async (id: string, obj: any) => {
  await Joi.object({
    id: Joi.string().guid(),
    notificationName: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
  }).validateAsync(
    { ...obj, id },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateUpdateNotificationAssignedUser = async (
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
      allowUnknown: false,
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
        allowUnknown: false,
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
      allowUnknown: false,
    }
  );
};

import * as Joi from "joi";

export const validateCreateContact = async (
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
    timezone: Joi.string(),
    emails: Joi.array().items(Joi.string().email()),
    emailLists: Joi.array().items(Joi.string().guid()),
  })
    .or("phoneNumbers", "emails")
    .validateAsync(
      { ...payload, companyId, employeeId },
      {
        abortEarly: true,
      }
    );
};

export const validateUpdateContact = async (
  employeeId: string,
  companyId: string,
  contactId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    contactId: Joi.string().guid().required(),
    name: Joi.string(),
    designation: Joi.string(),
    phoneNumbers: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
    emailLists: Joi.array().items(Joi.string().guid()),
  }).validateAsync(
    { ...payload, companyId, employeeId, contactId },
    {
      abortEarly: true,
    }
  );
};

export const validateDeleteContact = async (obj) => {
  return Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    notesId: Joi.string().guid().required(),
  }).validateAsync(obj);
};
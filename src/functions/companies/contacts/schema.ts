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
    details: Joi.object(),
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
    timezone: Joi.string(),
    details: Joi.object(),
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

export const validateUploadOrReplaceAvatar = async (
  employeeId,
  companyId,
  contactId,
  obj
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    contactId: Joi.string().guid().required(),
    newAvatarUrl: Joi.string().uri().required(),
  }).validateAsync({ employeeId, companyId, contactId, ...obj });
};

// export const validateAddEmail = async (employeeId, contactId, obj) => {
//   return Joi.object({
//     employeeId: Joi.string().guid().required(),
//     contactId: Joi.string().guid().required(),
//     email: Joi.string().email().required(),
//     emailType: Joi.string().required(),
//   }).validateAsync({ ...obj, employeeId, contactId });
// };

// export const validateDeleteEmail = async (employeeId, emailId) => {
//   return Joi.object({
//     employeeId: Joi.string().guid().required(),
//     emailId: Joi.string().guid().required(),
//   }).validateAsync({ employeeId, emailId });
// };

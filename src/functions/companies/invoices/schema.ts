import * as Joi from "joi";

export const validateCreateInvoice = async (
  companyId: string,
  createdBy: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    invoiceId: Joi.string(),
    title: Joi.string(),
    description: Joi.string(),
    companyId: Joi.string().guid().required(),
    additionalNotes: Joi.string(),
    invoiceItems: Joi.array(),
    discountDetails: Joi.array(),
    taxDetails: Joi.array(),

    senderId: Joi.string().guid(),
    senderName: Joi.string(),
    senderEmails: Joi.array().items(Joi.string().email()),
    senderPhoneNumbers: Joi.array(),
    senderCompanyName: Joi.string(),
    senderCompanyLogoUrl: Joi.string(),
    senderCompanyBillingAddress: Joi.string(),

    recipientCompanyId: Joi.string(),
    recipientCompanyName: Joi.string(),
    recipientCompanyBillingAddress: Joi.string(),
    recipientContactId: Joi.string(),
    recipientContactPhoneNumbers: Joi.array(),
    recipientContactEmails: Joi.array().items(Joi.string().email()),
    invoiceStatus: Joi.string(),
    currency: Joi.string(), // validate only registered currencies
    createdBy: Joi.string(),
  })
    .or("phoneNumbers", "emails")
    .validateAsync(
      { ...payload, companyId, createdBy },
      {
        abortEarly: true,
      }
    );
};

export const validateUpdateInvoice = async (
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

export const validateDeleteInvoice = async (obj) => {
  return Joi.object({
    employeeId: Joi.string().guid().required(),
    companyId: Joi.string().guid().required(),
    notesId: Joi.string().guid().required(),
  }).validateAsync(obj);
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

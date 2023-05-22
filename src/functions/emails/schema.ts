import * as Joi from "joi";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";

export const validateSendEmail = (obj: IEmailSqsEventInput) => {
  return Joi.object({
    details: Joi.array().items(
      Joi.object({
        toList: Joi.array()
          .items(
            Joi.object({
              email: Joi.string().email().required(),
              name: Joi.string(),
            })
          )
          .required(),
        subject: Joi.string().required(),
        body: Joi.string().required(),
        isBodyUploaded: Joi.boolean(),
        ccList: Joi.array().items(
          Joi.object({
            email: Joi.string().email().required(),
            name: Joi.string(),
          })
        ),
        bccList: Joi.array().items(
          Joi.object({
            email: Joi.string().email().required(),
            name: Joi.string(),
          })
        ),
        replyTo: Joi.array().items(Joi.string().email()),
        attachments: Joi.array().items(
          Joi.object({
            url: Joi.string().uri().required(),
            contentType: Joi.string(), // valid types can be found here
            // https://stackoverflow.com/questions/23714383/what-are-all-the-possible-values-for-http-content-type-header
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
            filename: Joi.string().required(),
          })
        ),
      })
    ),
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

export const validateBulkEmails = (obj) => {
  return Joi.object({
    emailListId: Joi.string().guid().required(),
    placeholders: Joi.array(),
    templateId: Joi.string().guid().required(),
    ccList: Joi.array().items(Joi.string().email()),
    bccList: Joi.array().items(Joi.string().email()),
    replyTo: Joi.array().items(Joi.string().email()),
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

export const validateEmailsByContact = (employeeEmail, contactEmail) => {
  return Joi.object({
    employeeEmail: Joi.string().email().required(),
    contactEmail: Joi.string().email().required(),
  }).validateAsync({ employeeEmail, contactEmail });
};

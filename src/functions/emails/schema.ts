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
    inReplyTo: Joi.string().allow(null),
    references: Joi.string().allow(null),
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

export const validateBulkEmails = (obj) => {
  return Joi.object({
    emailListId: Joi.string().guid().required(),
    templateId: Joi.string().guid().required(),
    defaultPlaceholders: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
      })
    ),
    defaultTags: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
      })
    ),
    ccList: Joi.array().items(Joi.string().email()),
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

export const validateEmailsByContact = async (employeeEmail, contactEmail) => {
  await Joi.object({
    employeeEmail: Joi.string().email().required(),
    contactEmail: Joi.string().email().required(),
  }).validateAsync({ employeeEmail, contactEmail });
};

export const validateMoveToFolder = async (body) => {
  await Joi.object({
    emailIds: Joi.array().items(Joi.string().guid()).required().min(1),
    folderName: Joi.string().required(),
  }).validateAsync(body);
};

export const validateGetMyEmails = async (body) => {
  await Joi.object({
    searchQuery: Joi.string(),
    from: Joi.string(),
    in: Joi.string(),
    to: Joi.string(),
    labels: Joi.string(),
    haveWords: Joi.string(),
    subject: Joi.string(),
    page: Joi.number().min(1),
    pageSize: Joi.number().min(1),
    // @TODO test returning Fields
    sortBy: Joi.string(),
    sortAscending: Joi.boolean(),
  })
    .validateAsync(body);
};

export const validateUpdateLabel = async (body) => {
  await Joi.object({
    emailIds: Joi.array().items(Joi.string().guid()).required().min(1),
    labels: Joi.array().items(Joi.string()).required().min(1),
  }).validateAsync(body);
};

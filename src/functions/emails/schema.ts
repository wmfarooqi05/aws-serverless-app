import * as Joi from "joi";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";

export const validateSendEmail = (obj: IEmailSqsEventInput) => {
  return Joi.object({
    details: Joi.array().items(
      Joi.object({
        senderId: Joi.string().guid().required(),
        senderEmail: Joi.string().email().required(),
        recipientId: Joi.string().guid().allow(null),
        recipientEmail: Joi.string().email().required(),
        recipientName: Joi.string(),
        subject: Joi.string().required(),
        body: Joi.string().required(),
        ccList: Joi.array().items(Joi.string().email()),
        bccList: Joi.array().items(Joi.string().email()),
        companyId: Joi.string().guid().allow(null),
        replyTo: Joi.array().items(Joi.string().email()),
        snsHeaders: Joi.string(),
      })
    ),
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

export const validateBulkEmails = (obj) => {
  return Joi.object({
    emailListId: Joi.string().guid().required(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
    ccList: Joi.array().items(Joi.string().email()),
    bccList: Joi.array().items(Joi.string().email()),
    replyTo: Joi.array().items(Joi.string().email()),
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

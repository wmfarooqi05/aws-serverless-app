import * as Joi from "joi";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";

export const validateSendEmail = (obj: IEmailSqsEventInput) => {
  return Joi.object({
    details: Joi.array().items(
      Joi.object({
        senderId: Joi.string().guid().required(),
        senderEmail: Joi.string().email().required(),
        senderName: Joi.string().required(),
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

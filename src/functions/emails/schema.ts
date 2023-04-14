import * as Joi from "joi";
// import { getPaginatedJoiKeys } from "src/common/schema";
// import EmailModel from "@models/dynamoose/Emails";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { IEmailSqsEventInput } from "@models/interfaces/Reminders";

// const schemaKeys = Object.keys(EmailModel.jsonSchema.properties);
export const validateSendEmail = (obj: IEmailSqsEventInput) => {
  return Joi.object({
    details: {
      senderId: Joi.string().guid().required(),
      senderEmail: Joi.string().email().required(),
      recipientId: Joi.string().guid().allow(null),
      recipientEmail: Joi.string().email().required(),
      subject: Joi.string().required(),
      body: Joi.string().required(),
      ccList: Joi.array().items(Joi.string().email()),
      bccList: Joi.array().items(Joi.string().email()),
      companyId: Joi.string().guid().allow(null),
      replyTo: Joi.array().items(Joi.string().email()),
      snsHeaders: Joi.string(),
    },
  }).validateAsync(obj, {
    allowUnknown: true,
  });
};

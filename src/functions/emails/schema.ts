import * as Joi from "joi";
import { getPaginatedJoiKeys } from "src/common/schema";
import EmailModel from "@models/Emails";

const schemaKeys = Object.keys(EmailModel.jsonSchema.properties);

export const validateGetEmails = async (obj: any) => {
  await Joi.object()
    .concat(getPaginatedJoiKeys(schemaKeys))
    .validateAsync(obj, {
      abortEarly: true,
    });
};

export const validateCreateEmail = async (updatedBy: string, obj: any) => {
  await Joi.object({
    teamName: Joi.string(),
    updatedBy: Joi.string(),
  }).validateAsync(
    { ...obj, updatedBy },
    {
      abortEarly: true,
      // @TODO cleanup api update
    }
  );
};

export const validateUpdateEmails = async (teamId: string, updatedBy: string, obj: any) => {
  await Joi.object({
    teamId: Joi.string().guid(),
    teamName: Joi.string(),
    updatedBy: Joi.string(),
  }).validateAsync(
    { ...obj, teamId, updatedBy },
    {
      abortEarly: true,
      // @TODO cleanup api update
    }
  );
};


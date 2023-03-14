import * as Joi from "joi";

export const validateGetEmployees = async (obj: any) => {
  await Joi.object({
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
    returningFields: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
  });
};

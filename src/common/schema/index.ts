import Joi from "joi";


export const getPaginatedJoiKeys = (
  schemaValidStrings: string[]
): Joi.ObjectSchema => {
  const schemaValidString = Joi.string().valid(...schemaValidStrings);
  return Joi.object({
    page: Joi.number().min(1),
    pageSize: Joi.number().min(1),
    // @TODO test returning Fields
    returningFields: Joi.array().items(schemaValidString),
    sortBy: Joi.array().items(schemaValidString),
    sortAscending: Joi.boolean(),
  });
};

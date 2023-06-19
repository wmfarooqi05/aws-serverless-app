import Joi from "joi";

export const validateCreateLabel = async (obj) => {
  await Joi.object({
    labelName: Joi.string().required(),
  }).validate(obj);
};

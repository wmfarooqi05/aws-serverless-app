import Joi from "joi";

export const validateGetPublicUrls = async (obj: any) => {
  await Joi.object({
    urls: Joi.array().items(Joi.string().uri()),
  }).validateAsync(obj, {
    abortEarly: true,
  });
};

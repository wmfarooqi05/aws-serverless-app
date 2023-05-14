import Joi from "joi";

export const validateCreateEmailTemplate = (obj) => {
  return Joi.object({
    templateContent: Joi.string(),
    htmlS3Link: Joi.string(),
    placeholders: Joi.array().items(Joi.string()),
    subjectPart: Joi.string().required(),
    templateName: Joi.string().required(),
    version: Joi.string().required(),
    thumbnailUrl: Joi.string(),
    // Joi.when("htmlS3Link", {
    //   is: Joi.exist(),
    //   then: Joi.string().required(),
    //   otherwise: Joi.not().required(),
    // }),
  })
    .xor("templateContent", "htmlS3Link")
    .validateAsync(obj, {
      allowUnknown: true,
      abortEarly: false,
    });
};

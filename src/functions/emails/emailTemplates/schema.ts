import Joi from "joi";

export const validateCreateEmailTemplate = async (obj) => {
  await Joi.object({
    /** @deprecated */
    templateContent: Joi.string(),
    htmlS3Link: Joi.string().required(),
    textS3Link: Joi.string(),
    /** @deprecated */
    placeholders: Joi.array().items(Joi.string()),
    subjectPart: Joi.string().required(),
    templateName: Joi.string().required(),
    /** @deprecated */
    thumbnailUrl: Joi.string(),
    saveAsDraft: Joi.boolean(),
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

export const validateDeleteTemplate = async (obj) => {
  await Joi.object({
    templateId: Joi.string().guid(),
    templateSesName: Joi.string(),
  }).xor("templateSesName", "templateId").validateAsync(obj);
};

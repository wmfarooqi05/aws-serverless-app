import * as Joi from "joi";

export const validateAddRemarksToLead = async (
  addedBy: string,
  payload: any
) => {
  await Joi.object({
    addedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid(),
    leadId: Joi.string().guid().required(),
    comments: Joi.string(),
  }).validateAsync(
    { ...payload, addedBy },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateCreateConversation = async (
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    leadId: Joi.string().guid().required(),
    remarksText: Joi.string().required().min(10).max(1500),
    employeeId: Joi.string().guid().required(),
    callDetails: Joi.object({
      phoneNumber: Joi.string().required(),
      callDuration: Joi.number().required().min(0), // seconds
    }),
    emailDetails: Joi.object({
      email: Joi.string().email().required(),
    }),
    concernedPersonDetails: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      designation: Joi.string().required(),
    }).required(),
    createdAt: Joi.string().isoDate(),
    updatedAt: Joi.string().isoDate(),
  })
    .or("callDetails", "emailDetails")
    .validateAsync(
      { ...payload, employeeId },
      {
        abortEarly: true,
        allowUnknown: false,
      }
    );
};

export const validateRemarks = async (employeeId: string, payload: any) => {
  await Joi.object({
    leadId: Joi.string().guid().required(),
    conversationId: Joi.string().guid().required(),
    remarksText: Joi.string().required().min(10).max(1500),
    employeeId: Joi.string().guid().required(),
    createdAt: Joi.string().isoDate(),
    updatedAt: Joi.string().isoDate(),
  }).validateAsync(
    { ...payload, employeeId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateUpdateRemarks = async (
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    leadId: Joi.string().guid().required(),
    conversationId: Joi.string().guid().required(),
    remarksId: Joi.string().guid().required(),
    remarksText: Joi.string().required().min(10).max(1500),
    employeeId: Joi.string().guid().required(),
  }).validateAsync(
    { ...payload, employeeId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

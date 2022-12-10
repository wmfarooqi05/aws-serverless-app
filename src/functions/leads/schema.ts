import * as Joi from "joi";

export const createLeadSchema = {
  type: "object",
  properties: {
    companyName: { type: "string" },
    phoneNumber: { type: "string" },
    address: { type: "string" },
    city: { type: "string" },
    country: { type: "string" },
    postalCode: { type: "string" },
    // concerned_persons: { type: 'JSON' },
    // remarks: { type: 'JSON' },
  },
  required: ["companyName"],
};

export const validateGetLeads = async (obj: any) => {
  await Joi.object({
    page: Joi.number().min(0),
    pageSize: Joi.number().min(0),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
  });
};

export const validateUpdateLeads = async (obj: any) => {
  await Joi.object({
    id: Joi.string().guid(),
    companyName: Joi.string(),
    phoneNumber: Joi.string(),
    address: Joi.string(),
    city: Joi.string(),
    country: Joi.string(),
    postalCode: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
  });
};

export const validateUpdateLeadAssignedUser = async (
  assignedBy: string,
  payload: any
) => {
  await Joi.object({
    assignedBy: Joi.string().guid().required(),
    assignTo: Joi.string().guid(),
    leadId: Joi.string().guid().required(),
    comments: Joi.string(),
  }).validateAsync(
    { ...payload, assignedBy },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

export const validateCreateConcernedPerson = async (
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    leadId: Joi.string().guid().required(),
    name: Joi.string().required(),
    designation: Joi.string(),
    phoneNumber: Joi.string(),
    email: Joi.string(),
  })
    .or("phoneNumber", "email")
    .validateAsync(
      { ...payload, employeeId },
      {
        abortEarly: true,
        allowUnknown: false,
      }
    );
};

export const validateUpdateConcernedPerson = async (
  employeeId: string,
  payload: any
) => {
  await Joi.object({
    employeeId: Joi.string().guid().required(),
    leadId: Joi.string().guid().required(),
    name: Joi.string(),
    designation: Joi.string(),
    phoneNumber: Joi.string(),
    email: Joi.string(),
  }).validateAsync(
    { ...payload, employeeId },
    {
      abortEarly: true,
      allowUnknown: false,
    }
  );
};

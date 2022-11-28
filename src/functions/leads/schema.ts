import * as Joi from 'joi';

export const createLeadSchema = {
  type: "object",
  properties: {
    company_name: { type: 'string' },
    phone_number: { type: 'string' },
    address: { type: 'string' },
    city: { type: 'string' },
    country: { type: 'string' },
    postal_code: { type: 'string' },
    // concerned_persons: { type: 'JSON' },
    // remarks: { type: 'JSON' },
  },
  required: ['company_name']
};

export const validateGetLeads = async (obj: any) => {
  await Joi.object({
    page: Joi.number()
      .min(0),
    pageSize: Joi.number().min(0),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
  });
}

// export const createUpdateLeads = async (obj: any) => {
//   const schema = Joi.object({
//     page: Joi.number()
//       .min(0),
//     pageSize: Joi.number().min(0),
//   });
// }

export const validateUpdateLeads = async (obj: any) => {
  await Joi.object({
    id: Joi.string().guid(),
    company_name: Joi.string(),
    phone_number: Joi.string(),
    address: Joi.string(),
    city: Joi.string(),
    country: Joi.string(),
    postal_code: Joi.string(),
  }).validateAsync(obj, {
    abortEarly: true,
    allowUnknown: false,
  });
}
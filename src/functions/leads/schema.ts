export default {
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
} as const;

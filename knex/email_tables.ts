export const tableName = {
  emails: process.env.EMAIL_TABLE || "emails",
  emailMetrics: process.env.EMAIL_TABLE || "email_metrics",
  emailRecipients: process.env.EMAIL_TABLE || "email_recipients",
  emailOptOuts: process.env.EMAIL_TABLE || "email_opt_outs",
  emailToEmailRecipients:
    process.env.EMAIL_TO_EMAIL_RECIPIENT_TABLE || "email_to_email_recipients",
  emailTemplates: process.env.EMAIL_TEMPLATES_TABLE || "email_templates",
  emailAddresses: process.env.EMAIL_ADDRESSES || "email_addresses",
  emailAddressToEmailList:
    process.env.EMAIL_ADDRESS_TO_EMAIL_LIST || "email_address_to_email_list",
};

export const tableName = {
  emailRecords: process.env.EMAIL_RECORDS_TABLE || "email_records",
  emailMetrics: process.env.EMAIL_RECORDS_TABLE || "email_metrics",
  emailRecipients: process.env.EMAIL_RECORDS_TABLE || "email_recipients",
  emailOptOuts: process.env.EMAIL_RECORDS_TABLE || "email_opt_outs",
  emailToEmailRecipients:
    process.env.EMAIL_TO_EMAIL_RECIPIENT_TABLE || "email_to_email_recipients",
  emailList: process.env.EMAIL_LIST || "email_lists",
  emailTemplates: process.env.EMAIL_TEMPLATES_TABLE || "email_templates",
  emailAddresses: process.env.EMAIL_ADDRESSES || "email_addresses",
  emailAddressToEmailList:
    process.env.EMAIL_ADDRESS_TO_EMAIL_LIST || "email_address_to_email_list",
  emailMetricsRecipients:
    process.env.EMAIL_METRICS_RECIPIENTS_TABLE || "email_metrics_recipients",
  recipientEmployeeDetails:
    process.env.RECIPIENT_EMPLOYEE_DETAILS || "recipient_employee_details",
  recipientCompanyDetails:
    process.env.RECIPIENT_COMPANY_DETAILS || "recipient_company_details",
  employeeEmailSettings:
    process.env.EMPLOYEE_EMAIL_SETTINGS || "employee_email_settings",
  employeeEmailLabels:
    process.env.EMPLOYEE_EMAIL_LABELS || "employee_email_labels",
};

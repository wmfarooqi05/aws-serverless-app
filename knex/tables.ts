export const tableName = {
  companies: process.env.COMPANIES_TABLE || "companies",
  employees: process.env.EMPLOYEES_TABLE || "employees",
  activities: process.env.ACTIVITIES_TABLE || "activities",
  pendingApprovals: process.env.PENDING_APPROVAL_TABLE || "pending_approvals",
  appAuditLogs: process.env.APP_AUDIT_LOGS_TABLE || "app_audit_logs",
  reminders: process.env.REMINDERS_TABLE || "reminders",
  notifications: process.env.NOTIFICATIONS_TABLE || "notifications",
  authTokens: process.env.AUTH_TOKENS_TABLE || "auth_tokens",
  jobs: process.env.JOBS_TABLE || "jobs",
  updateHistory: process.env.UPDATE_HISTORY_TABLE || "update_history",
  teams: process.env.TEAMS || "teams",
  accessPermissions:
    process.env.ACCESS_PERMISSIONS_TABLE || "access_permissions",
  // emails: process.env.EMAILS || "emails",
  // emailHistory: process.env.EMAIL_HISTORY || "email_history",
  employeeCompanyInteraction:
    process.env.EMPLOYEE_COMPANY_INTERACTIONS ||
    "employee_company_interactions",
  teamCompanyInteraction:
    process.env.TEAM_COMPANY_INTERACTIONS || "team_company_interactions",
  contacts: process.env.CONTACTS_TABLE || "contacts",
  employeeTeams: process.env.EMPLOYEE_TEAMS || "employee_teams",
  fileRecords: process.env.FILE_RECORDS || "file_records",
  fileVariations: process.env.FILE_VARIATIONS || "file_variations",
  jobExecutionHistory:
    process.env.JOB_EXECUTION_HISTORY || "job_execution_history",
};

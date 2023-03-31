export const tableName = {
  companies: process.env.COMPANIES_TABLE || "companies",
  employees: process.env.EMPLOYEES_TABLE || "employees",
  activities: process.env.ACTIVITIES_TABLE || "activities",
  pendingApprovals: process.env.PENDING_APPROVAL_TABLE || "pending_approvals",
  appAuditLogs: process.env.APP_AUDIT_LOGS_TABLE || "app_audit_logs",
  reminders: process.env.REMINDERS_TABLE || "reminders",
  notifications: process.env.NOTIFICATIONS_TABLE || "notifications",
  authTokens: process.env.AUTH_TOKENS || "auth_tokens",
  jobsResults: process.env.JOBS_RESULTS || "jobs_result",
  updateHistory: process.env.UPDATE_HISTORY || "update_history",
  teams: process.env.TEAMS || "teams",
};

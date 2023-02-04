export const tableName = {
  companies: process.env.COMPANIES_TABLE || "companies_local",
  users: process.env.USERS_TABLE || "users_local",
  activities: process.env.ACTIVITIES_TABLE || "activities_local",
  pendingApprovals: process.env.PENDING_APPROVAL_TABLE || "pending_approvals",
  appAuditLogs: process.env.APP_AUDIT_LOGS_TABLE || "app_audit_logs_local",
  reminders: process.env.REMINDERS || "reminders_local",
};
 
// @OTODO remove this logic and remove this library from package.json
import { get } from "lodash";

export const COMPANIES_TABLE_NAME = process.env.COMPANIES_TABLE || "companies";
export const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE || "activities";
export const EMPLOYEES_TABLE_NAME = process.env.EMPLOYEES_TABLE || "employees";
export const REMINDERS_TABLE_NAME = process.env.REMINDERS_TABLE || "reminders";
export const NOTIFICATIONS_TABLE_NAME =
  process.env.NOTIFICATIONS_TABLE || "notifications";
export const GLOBAL_SETTINGS_TABLE =
  process.env.GLOBAL_SETTINGS_TABLE || "GLOBAL_SETTINGS";

export const PENDING_APPROVAL_TABLE =
  process.env.PENDING_APPROVAL_TABLE || "pending_approvals";
export const AUTH_TOKEN_TABLE = process.env.AUTH_TOKENS_TABLE || "auth_tokens";
export const JOBS_TABLE = "jobs";
export const UPDATE_HISTORY_TABLE = (process.env.UPDATE_HISTORY_TABLE =
  "update_history");
export const TEAMS_TABLE = process.env.TEAMS_TABLE || "teams";
export const ACCESS_PERMISSIONS_TABLE =
  process.env.ACCESS_PERMISSIONS_TABLE || "access_permissions";
export const EMPLOYEE_COMPANY_INTERACTIONS_TABLE =
  process.env.EMPLOYEE_COMPANY_INTERACTIONS_TABLE ||
  "employee_company_interactions";
export const TEAM_COMPANY_INTERACTIONS_TABLE =
  process.env.TEAM_COMPANY_INTERACTIONS_TABLE || "team_company_interactions";
export const CONTACTS_TABLE = process.env.CONTACTS_TABLE || "contacts";
export const EMPLOYEE_TEAMS_TABLE =
  process.env.EMPLOYEE_TEAMS_TABLE || "employee_teams";
export const FILE_RECORDS = process.env.FILE_RECORDS || "file_records";
export const FILE_VARIATIONS = process.env.FILE_VARIATIONS || "file_variations";
export const INVOICES_TABLE = process.env.INVOICE_TABLE || "invoices";
export const JOB_EXECUTION_HISTORY =
  process.env.JOB_EXECUTION_HISTORY || "job_execution_history";

export type ModuleType =
  | "PENDING_APPROVALS"
  | "COMPANIES"
  | "ACTIVITIES"
  | "REMINDERS"
  | "NOTIFICATIONS";

export type ACTIONABLE_TYPE = "CREATE" | "DELETE" | "UPDATE";

export const NotifMap = {
  CreateCompany: {},
  UpdateCompany: {},
  DeleteCompany: {},
};

export const ModuleTitles = {
  COMPANY: "Company",
  ACTIVITY: "Activity",
  REMINDER: "Reminder",
};

export type IPermissionKey = "read" | "create" | "update" | "delete";

interface IPermissions {
  [k: string]: {
    permissions: Record<IPermissionKey, boolean>;
    childModules?: IPermissions;
  };
}

export const globalPermissions: IPermissions = {
  company: {
    permissions: {
      create: true,
      read: true,
      delete: false,
      update: false,
    },
    childModules: {
      contacts: {
        permissions: {
          create: false,
          read: true,
          delete: false,
          update: false,
        },
      },
    },
  },
};

export const getGlobalPermission = (
  keys: string,
  permissionKey: IPermissionKey
): any => {
  return get(globalPermissions, `${keys}.permissions.${permissionKey}`, false);
  // try {
  //   if (globalPermissions[key] !== undefined) {
  //     return globalPermissions[key] &&
  //       globalPermissions[key].toString() === "true"
  //       ? true
  //       : false;
  //   }
  // } catch (e) {}
  // return false;
  // // globalPermissions
};

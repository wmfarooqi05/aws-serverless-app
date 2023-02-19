import { ActivityService } from "@functions/activities/service";
import { CompanyService } from "@functions/companies/service";
import { NotificationService } from "@functions/notifications/service";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import { ReminderService } from "@functions/reminders/service";
import get from "lodash.get";

export const COMPANIES_TABLE_NAME = process.env.COMPANIES_TABLE || "companies";
export const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE || "activities";
export const USERS_TABLE_NAME = process.env.USERS_TABLE || "users";
export const REMINDERS_TABLE_NAME = process.env.REMINDERS_TABLE || "reminders";
export const NOTIFICATIONS_TABLE_NAME =
  process.env.NOTIFICATIONS_TABLE || "notifications";
export const GLOBAL_SETTINGS_TABLE =
  process.env.GLOBAL_SETTINGS_TABLE || "GLOBAL_SETTINGS";

export const PENDING_APPROVAL_TABLE =
  process.env.PENDING_APPROVAL_TABLE || "pending_approvals";

export type ModuleType =
  | "PENDING_APPROVALS"
  | "COMPANY"
  | "ACTIVITY"
  | "REMINDER"
  | "NOTIFICATION";

export const mapForModules: Record<ModuleType, any> = {
  PENDING_APPROVALS: PendingApprovalService,
  COMPANY: CompanyService,
  ACTIVITY: ActivityService,
  REMINDER: ReminderService,
  NOTIFICATION: NotificationService,
};

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
      concernedPersons: {
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

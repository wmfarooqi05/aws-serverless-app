import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { ACCESS_PERMISSIONS_TABLE, ModuleType } from "./commons";
import { IRoles } from "./interfaces/Employees";

enum PermissionTypes {
  READ_ALL = "READ_ALL",
  READ = "READ",
  CREATE = "CREATE",
  DELETE = "DELETE",
  UPDATE = "UPDATE",
}

export interface IAccessPermissions {
  id?: string;
  role: IRoles;
  tableName: ModuleType;
  permissionType: PermissionTypes;
  /** @deprecated */
  isAllowed: boolean;
  createPendingApproval: boolean;
  permissionKey: string;
  updatedBy?: string;
  allowedEmployees: Object[];
  specialPermissions: boolean;
}

@singleton()
export default class AccessPermissions extends Model {
  static get tableName() {
    return ACCESS_PERMISSIONS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: {
          type: "string",
        },
        role: {
          type: "string",
        },
        tableName: {
          type: "string",
        },
        permissionType: {
          type: "string",
        },
        isAllowed: {
          // we do not need is allowed, as we are not writing permission for every role individually
          //  we will check on basis of role, and if role is smaller, will check pending approval
          type: "boolean",
        },
        createPendingApproval: {
          type: "boolean",
        },
        specialPermissions: {
          type: "boolean",
          default: false,
        },
        /** this will be a map like this
         *  {
         *    user1: [1,2,3,4],
         *    user2: ['*'],
         * },
         *  */
        allowedEmployees: {
          type: "array",
        },
        permissionKey: {
          type: "string",
        },
        updatedBy: {
          type: "string",
        },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["role", "value"],
      additionalProperties: false,
    };
  }
}

export type IAccessPermissionsModel = ModelObject<AccessPermissions>;

export type IAccessPermissionsCacheMap = {
  [k in PERMISSION_KEY]: IAccessPermissions;
};

const defaultPermissions: IAccessPermissions = {
  role: "SALES_MANAGER_GROUP",
  tableName: "COMPANIES",
  permissionType: PermissionTypes.READ_ALL,
  isAllowed: true,
  createPendingApproval: true,
  allowedEmployees: [],
  permissionKey: "COMPANIES_READ_ALL",
  specialPermissions: true
};

const defaultAllowedPermissions: IAccessPermissions = {
  role: "SALES_REP_GROUP",
  tableName: "COMPANIES",
  permissionType: PermissionTypes.READ_ALL,
  isAllowed: true,
  createPendingApproval: true,
  allowedEmployees: [],
  permissionKey: "COMPANIES_READ_ALL",
  specialPermissions: true
};

const allowedManagers: IAccessPermissions = {
  role: "SALES_MANAGER_GROUP",
  tableName: "COMPANIES",
  permissionType: PermissionTypes.UPDATE,
  isAllowed: true,
  createPendingApproval: true,
  allowedEmployees: [],
  permissionKey: "COMPANY_CONVERT",
  specialPermissions: false
};

export type PERMISSION_KEY =
  | "*"
  | "COMPANY_READ_ALL"
  | "COMPANY_READ"
  | "COMPANY_CREATE"
  | "COMPANY_UPDATE"
  | "COMPANY_CONVERT"
  | "COMPANY_DELETE"
  | "CONCERNED_PERSON_CREATE"
  | "CONCERNED_PERSON_UPDATE"
  | "CONCERNED_PERSON_DELETE"
  | "NOTES_CREATE"
  | "NOTES_UPDATE"
  | "NOTES_DELETE"
  | "ACTIVITY_READ_ALL"
  | "ACTIVITY_READ"
  | "ACTIVITY_CREATE"
  | "ACTIVITY_UPDATE"
  | "ACTIVITY_DELETE"
  | "PENDING_APPROVAL_GET_MY"
  | "PENDING_APPROVAL_APPROVE";

export const accessPermissionsCacheMap: IAccessPermissionsCacheMap = {
  "*": defaultAllowedPermissions, // remove *
  COMPANY_READ_ALL: defaultAllowedPermissions,
  COMPANY_READ: defaultAllowedPermissions,
  COMPANY_CREATE: defaultPermissions,
  COMPANY_UPDATE: defaultPermissions,
  COMPANY_CONVERT: allowedManagers,
  COMPANY_DELETE: defaultPermissions,
  CONCERNED_PERSON_CREATE: defaultPermissions,
  CONCERNED_PERSON_UPDATE: defaultPermissions,
  CONCERNED_PERSON_DELETE: defaultPermissions,
  NOTES_CREATE: defaultPermissions,
  NOTES_UPDATE: defaultPermissions,
  NOTES_DELETE: defaultPermissions,
  // ACTIVITY
  ACTIVITY_READ: defaultAllowedPermissions,
  ACTIVITY_READ_ALL: defaultAllowedPermissions,
  ACTIVITY_CREATE: defaultAllowedPermissions,
  ACTIVITY_DELETE: defaultAllowedPermissions,
  ACTIVITY_UPDATE: defaultAllowedPermissions,
  PENDING_APPROVAL_GET_MY: defaultAllowedPermissions,
  PENDING_APPROVAL_APPROVE: defaultPermissions,
};

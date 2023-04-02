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
          type: "boolean"
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
};

export type PERMISSION_KEY =
  | "*"
  | "COMPANY_READ_ALL"
  | "COMPANY_READ"
  | "COMPANY_CREATE"
  | "COMPANY_UPDATE"
  | "COMPANY_DELETE";

export const accessPermissionsCacheMap: IAccessPermissionsCacheMap = {
  "*": defaultPermissions, // remove *
  COMPANY_READ_ALL: defaultPermissions,
  COMPANY_READ: defaultPermissions,
  COMPANY_CREATE: defaultPermissions,
  COMPANY_UPDATE: defaultPermissions,
  COMPANY_DELETE: defaultPermissions,
};

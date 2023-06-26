import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { FILE_PERMISSIONS } from "./commons";

export type FILE_PERMISSION_TYPE = "OWNER" | "READ" | "WRITE";
export type THUMBNAIL_STATUS =
  | "COMPLETED"
  | "REQUIRED"
  | "NOT_SUPPORTED"
  | "ERROR";
export type UPLOAD_STATUS = "UPLOADED" | "ERROR";

export interface FilePermissionsMap {
  [employeeId: string]: {
    employeeId: string;
    email: string;
    permissions: FILE_PERMISSION_TYPE[];
  };
}

export interface IFilePermissions {
  id?: string;
  fileUrl: string;
  fileKey: string;
  bucketName: string;
  region: string;
  contentType: string;
  fileSize?: string;
  originalFilename: string;
  thumbnailStatus: THUMBNAIL_STATUS;
  thumbnailUrl?: string;
  permissions: FilePermissionsMap;
  createdAt?: string;
  updatedAt?: string;
  uploadStatus: UPLOAD_STATUS;
  error: string;
}

@singleton()
export class FilePermissionModel extends Model {
  static get tableName() {
    return FILE_PERMISSIONS;
  }

  static get idColumn() {
    return "id";
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        fileUrl: { type: "string" },
        fileKey: { type: ["string", "null"] },
        bucketName: { type: ["string", "null"] },
        region: { type: ["string", "null"] },
        contentType: { type: ["string", "null"] },
        fileSize: { type: ["string", "null"] },
        originalFilename: { type: ["string", "null"], default: {} },
        thumbnailStatus: { type: ["string", "null"] },
        thumbnailUrl: { type: ["string", "null"] },
        permissions: { type: ["object", "null"] },
        uploadStatus: { type: ["string", "null"] },
        error: { type: ["string", "null"] },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }
}

export type IFilePermissionModel = ModelObject<FilePermissionModel>;
export type IFilePermissionPaginated = IWithPagination<IFilePermissionModel>;

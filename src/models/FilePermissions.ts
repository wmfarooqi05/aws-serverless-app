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

export interface PermissionsMap {
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
  fileType: string;
  fileSize: string;
  originalName: string;
  thumbnailStatus: THUMBNAIL_STATUS;
  thumbnailUrl?: string;
  permissions: PermissionsMap;
  createdAt?: string;
  updatedAt?: string;
  uploadStatus: "UPLOADED" | "ERROR";
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
      required: ["permissions"],

      properties: {
        id: { type: "string" },

        fileUrl: { type: "string" },
        fileKey: { type: "string" },
        bucketName: { type: "string" },
        region: { type: "string" },
        fileType: { type: "string" },
        fileSize: { type: "string" },
        originalName: { type: "string" },
        // in future, run a job to insert thumbnails of files
        // instead of doing it manually
        thumbnailStatus: { type: "string" },
        thumbnailUrl: { type: "string" },
        permissions: { type: "object", default: {} },
        uploadStatus: UPLOAD_STATUS;
        error: string;
        created_at: { type: "timestamp" },
        updated_at: { type: "timestamp" },
      },
    };
  }
}

export type IFilePermissionModel = ModelObject<FilePermissionModel>;
export type IFilePermissionPaginated = IWithPagination<IFilePermissionModel>;

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { FILE_RECORDS } from "./commons";

export type FILE_PERMISSION_TYPE = "OWNER" | "READ" | "WRITE";
export type THUMBNAIL_STATUS =
  | "COMPLETED"
  | "PENDING"
  | "REQUIRED"
  | "NOT_SUPPORTED"
  | "ERROR";
export type FILE_STATUS =
  | "PENDING"
  | "UPLOADING"
  | "UPLOADED"
  | "ERROR"
  | "TO_BE_DELETED"
  | "DELETE_IN_PROGRESS"
  | "DELETE_ERROR";

export interface FilePermissionsMap {
  [employeeId: string]: {
    employeeId: string;
    email: string;
    permissions: FILE_PERMISSION_TYPE[];
  };
}

export interface FILE_VARIATION {
  fileSize: string;
  fileUrl: string;
  fileKey: string;
  /** in case original file is video or pdf, so thumbnail will be image */
  contentType: string;
  /**
   * can be `800x800`, `600x600` or similar
   */
  dimensions: string;
  /**
   * can be `THUMBNAIL`, `MEDIUM`, `LARGE`, `SMALL` or similar
   */
  fileType: string;
}

export type VARIATION_STATUS = "REQUIRED" | "NOT_REQUIRED";

export interface IFilePermissions {
  id?: string;
  fileUrl: string;
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  resolution?: string;

  bucketName?: string;
  region?: string;
  originalFilename?: string;
  permissions?: FilePermissionsMap;
  createdAt?: string;
  updatedAt?: string;
  status?: FILE_STATUS;
  details?: any;
  // variationStatus: VARIATION_STATUS;
  // variations: FILE_VARIATION[];
  keyWords?: string[];
}

@singleton()
export class FilePermissionModel extends Model {
  static get tableName() {
    return FILE_RECORDS;
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
        s3Key: { type: "string" },
        fileName: { type: "string" },
        fileType: { type: "string" },
        fileSize: { type: "string" },
        resolution: { type: "string" },

        fileKey: { type: ["string", "null"] },
        bucketName: { type: ["string", "null"] },
        region: { type: ["string", "null"] },
        originalFilename: { type: ["string", "null"], default: "" },
        permissions: { type: ["object", "null"] },
        status: { type: ["string", "null"] },
        details: { type: "object", default: {} },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  static get jsonAttributes() {
    return ["permissions", "details", "variations"];
  }

  static $beforeInsert(queryContext) {
    console.log("beforeInsert queryContext", queryContext);
    if (queryContext?.contentType?.includes("image")) {
      queryContext.variationStatus = "PENDING";
    } else {
      queryContext.variationStatus = "NOT_REQUIRED";
    }
  }
}

export type IFilePermissionModel = ModelObject<FilePermissionModel>;
export type IFilePermissionPaginated = IWithPagination<IFilePermissionModel>;

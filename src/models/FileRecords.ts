import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { FILE_RECORDS } from "./commons";
import { FileVariationModel } from "./FileVariations";

export type FILE_RECORD_TYPE = "OWNER" | "READ" | "WRITE";
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
    permissions: FILE_RECORD_TYPE[];
  };
}

export const ReadAllPermissions: FilePermissionsMap = {
  "*": {
    email: "*",
    employeeId: "*",
    permissions: ["READ"],
  },
};

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

export type FILE_VARIATION_TYPE =
  | "THUMBNAIL"
  | "SMALL"
  | "MEDIUM"
  | "LARGE"
  | "FULL_SNAPSHOT";
export interface IMAGE_SIZE {
  width: number;
  height: number;
}

export const variationMap: Record<FILE_VARIATION_TYPE, IMAGE_SIZE> = {
  THUMBNAIL: {
    width: 300,
    height: 300,
  },
  FULL_SNAPSHOT: {
    width: 2000,
    height: 2000,
  },
};

export interface IFileRecordDetails {
  variations?: {
    variationStatus: VARIATION_STATUS;
    variationSizes: FILE_VARIATION_TYPE[];
  };
  error?: any;
}

export interface IFileRecords {
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
  details?: IFileRecordDetails;
  // variationStatus: VARIATION_STATUS;
  // variations: FILE_VARIATION[];
  keyWords?: string[];
}

@singleton()
export class FileRecordModel extends Model {
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
    // console.log("beforeInsert queryContext", queryContext);
    // if (queryContext?.contentType?.includes("image")) {
    //   queryContext.variationStatus = "PENDING";
    // } else {
    //   queryContext.variationStatus = "NOT_REQUIRED";
    // }
  }

  static get relationMappings() {
    return {
      variations: {
        relation: Model.HasManyRelation,
        modelClass: FileVariationModel,
        join: {
          from: `${FileRecordModel.tableName}.id`,
          to: `${FileVariationModel.tableName}.originalFileId`,
        },
      },
    };
  }
}

export type IFileRecordModel = ModelObject<FileRecordModel>;
export type FileRecordPaginated = IWithPagination<IFileRecordModel>;

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { FILE_RECORDS, FILE_VARIATIONS } from "./commons";
import { FILE_STATUS, FILE_VARIATION_TYPE } from "./FileRecords";

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

export interface IFileVariation {
  id?: string;
  fileUrl: string;
  originalFileId: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  resolution?: string;

  createdAt?: string;
  updatedAt?: string;
  status?: FILE_STATUS;
  details?: any;
}

@singleton()
export class FileVariationModel extends Model {
  static get tableName() {
    return FILE_VARIATIONS;
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
        originalFileId: { type: "string" },
        fileName: { type: "string" },
        fileType: { type: "string" },
        fileSize: { type: "string" },
        resolution: { type: "string" },

        status: { type: ["string", "null"] },
        details: { type: "object", default: {} },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  static get jsonAttributes() {
    return ["details"];
  }
}

export type IFileVariationModel = ModelObject<FileVariationModel>;
export type FileVariationPaginated = IWithPagination<IFileVariationModel>;

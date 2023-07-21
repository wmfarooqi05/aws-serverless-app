import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { EMAIL_TEMPLATES_TABLE } from "./commons";
import { singleton } from "tsyringe";

export interface IEmailTemplate {
  id?: string;
  templateName: string;
  templateSesName: string;
  placeholders: string[];
  awsRegion: string;
  version: string;
  subject: string;
  htmlPartUrl: string;
  textPartUrl: string;
  thumbnailUrl?: string;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
  status: "DRAFT" | "QUEUED" | "IN_PROGRESS" | "READY" | "ERROR";
  details: any;
}

@singleton()
export class EmailTemplatesModel extends Model {
  static get tableName() {
    return EMAIL_TEMPLATES_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["templateName", "awsRegion", "version"],

      properties: {
        id: { type: "string" },
        templateName: { type: "string" },
        templateSesName: { type: "string" },
        placeholders: { type: "array", default: [] },
        awsRegion: { type: "string" },
        version: { type: "string", default: "version1" },
        htmlPartUrl: { type: "string" },
        textPartUrl: { type: "string" },
        subject: { type: "string" },
        thumbnailUrl: { type: "string" },
        details: { type: "object", default: {} },
        status: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  static get jsonAttributes() {
    return ["placeholders", "details"];
  }
}

export type IEmailTemplatesModel = ModelObject<EmailTemplatesModel>;
export type IEmailTemplatesPaginated = IWithPagination<IEmailTemplatesModel>;

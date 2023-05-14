import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { EMAIL_TEMPLATES_TABLE } from "./common";
import { singleton } from "tsyringe";

export interface IEmailTemplate {
  id?: string;
  templateName: string;
  placeholders: string[];
  awsRegion: string;
  version: string;
  thumbnailUrl?: string;
  sesResponse?: string;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
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
        placeholders: { type: "array", default: [] },
        awsRegion: { type: "string" },
        version: { type: "string", default: "version1" },
        thumbnailUrl: { type: "string" },
        sesResponse: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  static get jsonAttributes() {
    return ["placeholders", "sesResponse"];
  }
}

export type IEmailTemplatesModel = ModelObject<EmailTemplatesModel>;
export type IEmailTemplatesPaginated = IWithPagination<IEmailTemplatesModel>;

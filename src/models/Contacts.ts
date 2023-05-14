import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { COMPANIES_TABLE_NAME, CONTACTS_TABLE } from "./commons";

export interface IContact {
  id: string;
  name: string;
  designation: string;
  phoneNumbers: string[];
  emails: string[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
  emailList: string[];
}

@singleton()
export default class ContactModel extends Model {
  static get tableName() {
    return CONTACTS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        designation: { type: "string" },
        phoneNumbers: { type: "array" },
        timezone: { type: "string" },
        details: { type: "object" },
        companyId: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["name", "companyId"],
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    company: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: COMPANIES_TABLE_NAME,
      join: {
        from: `${CONTACTS_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["phoneNumbers", "emails", "emailList", "details"];
  }
}

export type IContactModel = ModelObject<ContactModel>;
export type IContactPaginated = IWithPagination<IContactModel>;

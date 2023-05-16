import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  COMPANIES_TABLE_NAME,
  CONTACTS_TABLE,
  CONTACT_EMAILS_TABLE,
} from "./commons";
import ContactEmailsModel from "./ContactEmails";

export interface IContact {
  id: string;
  name: string;
  designation: string;
  phoneNumbers: string[];
  timezone: string;
  details: any;
  companyId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  emails: string[];
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
        emails: { type: "array" },
        timezone: { type: "string" },
        details: { type: "object" },
        companyId: { type: "string" },
        createdBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["name", "companyId"],
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    // contactEmails: {
    //   relation: Model.HasManyRelation,
    //   // The related model.
    //   modelClass: ContactEmailsModel,
    //   join: {
    //     from: `${CONTACTS_TABLE}.id`,
    //     to: `${CONTACT_EMAILS_TABLE}.contactId`,
    //   },
    // },
    company: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: COMPANIES_TABLE_NAME,
      join: {
        from: `${CONTACTS_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
    // emails: {},
  });

  static get jsonAttributes() {
    return ["phoneNumbers", "details", "emails"];
  }
}

export type IContactModel = ModelObject<ContactModel>;
export type IContactPaginated = IWithPagination<IContactModel>;

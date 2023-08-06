import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { COMPANIES_TABLE_NAME, CONTACTS_TABLE } from "./commons";
import CompanyModel from "./Company";
import { FileRecordModel } from "./FileRecords";

export const validPlaceHolders = [
  "email",
  "name",
  "designation",
  "phoneNumbers",
  "companyName",
];

export interface IContact {
  id: string;
  name: string;
  avatar?: string;
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
        avatar: { type: "string" },
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
      relation: Model.HasOneRelation,
      // The related model.
      modelClass: CompanyModel,
      join: {
        from: `${CONTACTS_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
    contactAvatar: {
      relation: Model.BelongsToOneRelation,
      modelClass: FileRecordModel,
      join: {
        from: `${ContactModel.tableName}.avatar`,
        to: `${FileRecordModel.tableName}.id`,
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

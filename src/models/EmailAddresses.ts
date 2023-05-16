import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  CONTACTS_TABLE,
  EMAIL_ADDRESSES_TABLE,
  EMAIL_LIST_TABLE,
  EMAIL_LIST_TO_CONTACT_EMAILS,
} from "./commons";
import EmailListModel from "./EmailLists";
import ContactModel from "./Contacts";

export interface IEmailAddresses {
  id: string;
  contactId: string;
  email: string;
  updatedAt: string;
}

@singleton()
export default class EmailAddressesModel extends Model {
  static get tableName() {
    return EMAIL_ADDRESSES_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        contactId: { type: "string" },
        email: { type: "string" },
        emailType: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["email", "contactId"],
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    emailLists: {
      relation: Model.ManyToManyRelation,
      // The related model.
      modelClass: EmailListModel,
      join: {
        from: `${EMAIL_ADDRESSES_TABLE}.id`,
        through: {
          from: `${EMAIL_LIST_TO_CONTACT_EMAILS}.contact_email_id`,
          to: `${EMAIL_LIST_TO_CONTACT_EMAILS}.email_list_id`,
          onDelete: 'NO ACTION'
        },
        to: `${EMAIL_LIST_TABLE}.id`,
      },
    },
    contact: {
      relation: Model.HasOneRelation,
      // The related model.
      modelClass: ContactModel,
      join: {
        from: `${EMAIL_ADDRESSES_TABLE}.contactId`,
        to: `${CONTACTS_TABLE}.id`,
      },
    },
  });
}

export type IEmailAddressesModel = ModelObject<EmailAddressesModel>;
export type IEmailAddressesPaginated = IWithPagination<IEmailAddressesModel>;

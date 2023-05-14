import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  CONTACTS_TABLE,
  CONTACT_EMAILS_TABLE,
  EMAIL_LIST_TABLE,
  EMAIL_LIST_TO_CONTACT_EMAILS,
} from "./commons";
import EmailListModel from "./EmailLists";

export interface IContactEmails {
  id: string;
  contactId: string;
  email: string;
  updatedAt: string;
}

@singleton()
export default class ContactEmailsModel extends Model {
  static get tableName() {
    return CONTACT_EMAILS_TABLE;
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
        updatedAt: { type: "string" },
      },
      required: ["email", "contactId"],
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    contact: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: CONTACTS_TABLE,
      join: {
        from: `${CONTACTS_TABLE}.contactId`,
        to: `${CONTACT_EMAILS_TABLE}.id`,
      },
    },
    emailLists: {
      relation: Model.ManyToManyRelation,
      // The related model.
      modelClass: EmailListModel,
      join: {
        from: `${CONTACT_EMAILS_TABLE}.id`,
        through: {
          from: `${EMAIL_LIST_TO_CONTACT_EMAILS}.contact_email_id`,
          to: `${EMAIL_LIST_TO_CONTACT_EMAILS}.email_list_id`,
        },
        to: `${EMAIL_LIST_TABLE}.id`,
      },
    },
  });
}

export type IContactEmailsModel = ModelObject<ContactEmailsModel>;
export type IContactEmailsPaginated = IWithPagination<IContactEmailsModel>;
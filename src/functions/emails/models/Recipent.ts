import { IWithPagination } from "knex-paginate";
import { Model, ModelObject, QueryContext } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_RECIPIENT_TABLE,
  EMAIL_TABLE,
  EMAIL_TO_EMAIL_RECIPIENT_TABLE,
} from "./common";
import { EmailModel } from "./Email";

export type RECIPIENT_TYPE = "TO_LIST" | "CC_LIST" | "BCC_LIST";

export interface IRecipient {
  id?: string;
  emailId?: string;
  recipientType: RECIPIENT_TYPE;
  recipientName?: string;
  recipientEmail: string;
}

@singleton()
export class RecipientModel extends Model {
  static get tableName() {
    return EMAIL_RECIPIENT_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["emailId", "recipientEmail", "recipientType"],

      properties: {
        id: { type: "string" },
        emailId: { type: "string" },
        recipientType: { type: "string" },
        recipientName: { type: "string" },
        recipientEmail: { type: "string" },
      },
    };
  }

  static get relationMappings() {
    return {
      emails: {
        relation: Model.ManyToManyRelation,
        modelClass: EmailModel,
        join: {
          from: `${EMAIL_RECIPIENT_TABLE}.id`,
          through: {
            from: `${EMAIL_TO_EMAIL_RECIPIENT_TABLE}.recipientId`,
            to: `${EMAIL_TO_EMAIL_RECIPIENT_TABLE}.emailId`,
            onDelete: "NO ACTION",
          },
          to: `${EMAIL_TABLE}.id`,
        },
      },
    };
  }

  async $afterInsert(context: QueryContext): Promise<any> {
    console.log("context", context);
  }
}

export type IRecipientModel = ModelObject<RecipientModel>;
export type IRecipientPaginated = IWithPagination<IRecipientModel>;

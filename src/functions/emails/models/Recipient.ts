import { IWithPagination } from "knex-paginate";
import { Model, ModelObject, QueryContext } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_RECIPIENT_TABLE,
  EMAIL_RECORDS_TABLE,
  EMAIL_TO_EMAIL_RECIPIENT_TABLE,
} from "./commons";
import { EmailRecordModel } from "./EmailRecords";

export type RECIPIENT_TYPE = "FROM" | "TO_LIST" | "CC_LIST" | "BCC_LIST";
export type RECIPIENT_CATEGORY = "EMPLOYEE" | "COMPANY_CONTACT" | "OTHERS";
export const recipientCategoryTypes: RECIPIENT_CATEGORY[] = [
  "COMPANY_CONTACT",
  "EMPLOYEE",
  "OTHERS",
];

export interface IRecipient {
  id?: string;
  emailId?: string;
  recipientType: RECIPIENT_TYPE;
  recipientName?: string;
  recipientEmail: string;
  threadId: string;
  recipientCategory?: RECIPIENT_CATEGORY;
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
        threadId: { type: ["string", "null"], default: null },
        recipientCategory: {
          type: "string",
          default: "OTHERS" as RECIPIENT_CATEGORY,
          enum: recipientCategoryTypes,
        },
      },
    };
  }

  static get relationMappings() {
    return {
      email: {
        relation: Model.HasOneRelation,
        modelClass: EmailRecordModel,
        join: {
          from: `${EMAIL_RECIPIENT_TABLE}.emailId`,
          to: `${EMAIL_RECORDS_TABLE}.id`,
        },
      },
    };
  }
}

export type IRecipientModel = ModelObject<RecipientModel>;
export type IRecipientPaginated = IWithPagination<IRecipientModel>;

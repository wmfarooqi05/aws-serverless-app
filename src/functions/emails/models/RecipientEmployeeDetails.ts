import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMAIL_RECIPIENT_TABLE, RECIPIENT_EMPLOYEE_DETAILS } from "./commons";
import { RecipientModel } from "./Recipient";

export type RECIPIENT_TYPE = "FROM" | "TO_LIST" | "CC_LIST" | "BCC_LIST";
export type RECIPIENT_CATEGORY = "EMPLOYEE" | "COMPANY_CONTACT" | "OTHERS";
export const recipientCategoryTypes: RECIPIENT_CATEGORY[] = [
  "COMPANY_CONTACT",
  "EMPLOYEE",
  "OTHERS",
];

export const generalFolders = [
  'inbox',
  'sent_items',
  'trash',
  'important',
  'spam',
  'starred',
  "archived"
//  'draft' will be managed later
]

export interface IRecipientEmployeeDetails {
  id?: string;
  employeeId: string;
  recipientId?: string;
  folderName: string;
  labels?: string[];
  isRead: boolean;
  /** @deprecated */
  category?: string;
}

@singleton()
export class RecipientEmployeeDetailsModel extends Model {
  static get tableName() {
    return RECIPIENT_EMPLOYEE_DETAILS;
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["recipientId", "employeeId", "folderName", "isRead"],

      properties: {
        id: { type: "string" },
        employeeId: { type: "string" },
        recipientId: { type: "string" },
        folderName: { type: "string" },
        labels: { type: "array", default: [] },
        isRead: { type: "boolean" },
        category: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  static get jsonAttributes() {
    return ["labels"];
  }

  static modifiers = {
    filterMe(query, employeeId) {
      query.where("employeeId", employeeId);
    },
  };
  static get relationMappings() {
    return {
      recipient: {
        relation: Model.HasOneRelation,
        modelClass: RecipientModel,
        join: {
          from: `${RECIPIENT_EMPLOYEE_DETAILS}.recipient_id`,
          to: `${EMAIL_RECIPIENT_TABLE}.id`,
        },
      },
    };
  }
}

export type IRecipientEmployeeDetailsModel =
  ModelObject<RecipientEmployeeDetailsModel>;
export type IRecipientEmployeeDetailsPaginated =
  IWithPagination<IRecipientEmployeeDetailsModel>;

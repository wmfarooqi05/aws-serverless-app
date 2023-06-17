import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { RECIPIENT_EMPLOYEE_DETAILS } from "./commons";

export type RECIPIENT_TYPE = "FROM" | "TO_LIST" | "CC_LIST" | "BCC_LIST";
export type RECIPIENT_CATEGORY = "EMPLOYEE" | "COMPANY_CONTACT" | "OTHERS";
export const recipientCategoryTypes: RECIPIENT_CATEGORY[] = [
  "COMPANY_CONTACT",
  "EMPLOYEE",
  "OTHERS",
];

export interface IRecipientEmployeeDetails {
  id?: string;
  email: string;
  recipientId?: string;
  folderName: string;
  labels?: string;
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
      required: ["recipientId", "folderName", "isRead"],

      properties: {
        id: { type: "string" },
        email: { type: "string" },
        recipientId: { type: "string" },
        folderName: { type: "string" },
        labels: { type: "string" },
        isRead: { type: "boolean" },
        category: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    };
  }

  // static get relationMappings() {
  //   return {
  //     contact: {
  //       relation: Model.HasOneRelation,
  //       modelClass: EmailRecordModel,
  //       join: {
  //         from: `${RECIPIENT_EMPLOYEE_DETAILS}.emailId`,
  //         to: `${EMAIL_RECORDS_TABLE}.id`,
  //       },
  //     },
  //   };
  // }
}

export type IRecipientEmployeeDetailsModel =
  ModelObject<RecipientEmployeeDetailsModel>;
export type IRecipientEmployeeDetailsPaginated =
  IWithPagination<IRecipientEmployeeDetailsModel>;

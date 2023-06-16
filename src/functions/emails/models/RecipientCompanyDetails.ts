import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { RECIPIENT_COMPANY_DETAILS } from "./commons";

export type RECIPIENT_TYPE = "FROM" | "TO_LIST" | "CC_LIST" | "BCC_LIST";
export type RECIPIENT_CATEGORY = "EMPLOYEE" | "COMPANY_CONTACT" | "OTHERS";
export const recipientCategoryTypes: RECIPIENT_CATEGORY[] = [
  "COMPANY_CONTACT",
  "EMPLOYEE",
  "OTHERS",
];

export interface IRecipientCompanyDetails {
  id?: string;
  companyId: string;
  contactId: string;
  recipientId?: string;
}

@singleton()
export class RecipientCompanyDetailsModel extends Model {
  static get tableName() {
    return RECIPIENT_COMPANY_DETAILS;
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["recipientId", "companyId", "contactId"],

      properties: {
        id: { type: "string" },
        companyId: { type: "string" },
        contactId: { type: "string" },
        recipientId: { type: "string" },
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

export type IRecipientCompanyDetailsModel =
  ModelObject<RecipientCompanyDetailsModel>;
export type IRecipientCompanyDetailsPaginated =
  IWithPagination<IRecipientCompanyDetailsModel>;

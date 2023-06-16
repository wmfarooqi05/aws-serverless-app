import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  EMAIL_RECIPIENT_TABLE,
  EMAIL_RECORDS_TABLE,
  RECIPIENT_COMPANY_DETAILS,
  RECIPIENT_EMPLOYEE_DETAILS,
} from "./commons";
import { EmailRecordModel } from "./EmailRecords";
import {
  IRecipientEmployeeDetails,
  RecipientEmployeeDetailsModel,
} from "./RecipientEmployeeDetails";
import { IRecipientCompanyDetails, RecipientCompanyDetailsModel } from "./RecipientCompanyDetails";

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
  recipientEmployeeDetails?: IRecipientEmployeeDetails;
  recipientCompanyDetails?: IRecipientCompanyDetails;
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
      recipientEmployeeDetails: {
        relation: Model.HasOneRelation,
        modelClass: RecipientEmployeeDetailsModel,
        join: {
          from: `${EMAIL_RECIPIENT_TABLE}.id`,
          to: `${RECIPIENT_EMPLOYEE_DETAILS}.recipientId`,
        },
      },
      recipientCompanyDetails: {
        relation: Model.HasOneRelation,
        modelClass: RecipientCompanyDetailsModel,
        join: {
          from: `${EMAIL_RECIPIENT_TABLE}.id`,
          to: `${RECIPIENT_COMPANY_DETAILS}.recipientId`,
        },
      },
    };
  }
}

export type IRecipientModel = ModelObject<RecipientModel>;
export type IRecipientPaginated = IWithPagination<IRecipientModel>;

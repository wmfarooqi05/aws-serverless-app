import { IWithPagination } from "knex-paginate";
import {
  Model,
  ModelObject,
  RelationMappings,
  RelationMappingsThunk,
} from "objection";
import { singleton } from "tsyringe";
import { INVOICES_TABLE } from "./commons";

export interface IInvoiceSender {
  senderId?: string;
  senderName: string;
  senderAddress: string;
  senderEmails: string;
  senderPhoneNumbers: string;
  senderCompanyName: string;
  senderCompanyLogoUrl: string;
}

export interface IInvoiceRecipient {
  companyName: string;
}

export interface IInvoice {}

export type CURRENCIES = "USD" | "CAD" | "PKR" | "INR";
export const currencies: CURRENCIES[] = ["USD", "CAD", "PKR", "INR"];

@singleton()
export default class InvoiceModel extends Model {
  static get tableName() {
    return INVOICES_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        // can be added manually or automatically
        // it is different than Id because it can be COMP_YY_MM_DDDD_NUM or some other format
        invoiceId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        additionalNotes: { type: "string" },
        invoiceItems: { type: "array" },
        subTotal: { type: "string" },
        discountDetails: { type: "array" },
        taxDetails: { type: "array" },
        total: { type: "string" },

        // Sender related details
        senderId: { type: "string" },
        senderName: { type: "string" },
        senderEmails: { type: "string" },
        senderPhoneNumbers: { type: "string" },
        senderCompanyName: { type: "string" },
        senderCompanyLogoUrl: { type: "string" },
        senderCompanyBillingAddress: { type: "string" },

        // Recipient related details
        recipientCompanyId: { type: "string" },
        recipientCompanyName: { type: "string" },
        recipientCompanyBillingAddress: { type: "string" },

        recipientContactId: { type: "string" },
        recipientContactName: { type: "string" },
        recipientContactPhoneNumbers: { type: "string" },
        recipientContactEmails: { type: "string" },

        invoiceStatus: { type: "string" },
        currency: { type: "string", default: "CAD" as CURRENCIES },
        createdBy: { type: "string" }, // usually same as senderId

        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      // required: ["name", "username", "email", "role"],
      additionalProperties: false,
    };
  }

  // static get jsonAttributes() {
  // return ["addresses", "settings", "socialProfiles", "secondaryPhoneNumbers"];
  // }

  static relationMappings: RelationMappings | RelationMappingsThunk = () => ({
    // teams: {
    //   relation: Model.ManyToManyRelation,
    //   modelClass: TeamModel,
    //   join: {
    //     from: `${InvoiceModel.tableName}.id`,
    //     through: {
    //       from: `${EMPLOYEE_TEAMS_TABLE}.employee_id`,
    //       to: `${EMPLOYEE_TEAMS_TABLE}.team_id`,
    //       onDelete: "CASCADE",
    //     },
    //     to: `${TeamModel.tableName}.id`,
    //   },
    // },
  });
}

export type IInvoiceModel = ModelObject<InvoiceModel>;
export type IInvoicePaginated = IWithPagination<IInvoiceModel>;

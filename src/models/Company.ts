import { IWithPagination } from "knex-paginate";
import {
  Model,
  ModelObject,
  RelationMappings,
  RelationMappingsThunk,
} from "objection";
import { singleton } from "tsyringe";
import { COMPANIES_TABLE_NAME, CONTACTS_TABLE } from "./commons";

import ContactModel from "./Contacts";
import TeamCompanyInteractionsModel from "./TeamCompanyInteractions";
import EmployeeCompanyInteractionsModel from "./EmployeeCompanyInteractions";

@singleton()
export default class CompanyModel extends Model {
  static get tableName() {
    return COMPANIES_TABLE_NAME;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        companyName: { type: "string" },
        avatar: { type: "string" },
        createdBy: { type: "string" },
        addresses: { type: "array" },
        assignedTo: { type: "string" },
        assignedBy: { type: "string" },
        details: { type: "object" },
        // remove this key maybe
        tags: { type: "string" }, // comma separated strings
        timezone: { type: "string" },
        // @TODO typecasting issues
        updatedAt: { type: "string" },
      },
      required: ["companyName"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings: RelationMappings | RelationMappingsThunk = () => ({
    // assigned_by: {
    //   relation: Model.BelongsToOneRelation,
    //   // The related model.
    //   modelClass: Employee,
    //   join: {
    //     from: `${COMPANIES_TABLE_NAME}.assignedBy`,
    //     to: `${EMPLOYEES_TABLE_NAME}.id`,
    //   },
    // },
    // assigned_to: {
    //   relation: Model.BelongsToOneRelation,
    //   // The related model.
    //   modelClass: Employee,
    //   join: {
    //     from: `${COMPANIES_TABLE_NAME}.assignedTo`,
    //     to: `${EMPLOYEES_TABLE_NAME}.id`,
    //   },
    // },
    contacts: {
      relation: Model.HasManyRelation,
      modelClass: ContactModel,
      join: {
        from: `${COMPANIES_TABLE_NAME}.id`,
        to: `${CONTACTS_TABLE}.companyId`,
      },
    },
    teamInteractions: {
      relation: Model.HasManyRelation,
      modelClass: TeamCompanyInteractionsModel,
      join: {
        from: `${CompanyModel.tableName}.id`,
        to: `${TeamCompanyInteractionsModel.tableName}.companyId`,
      },
    },
    employeeInteractions: {
      relation: Model.HasManyRelation,
      modelClass: EmployeeCompanyInteractionsModel,
      join: {
        from: `${CompanyModel.tableName}.id`,
        to: `${EmployeeCompanyInteractionsModel.tableName}.companyId`,
      },
    },
  });

  static get jsonAttributes() {
    return ["addresses", "details"];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type ICompanyModel = ModelObject<CompanyModel>;
export type ICompanyPaginated = IWithPagination<ICompanyModel>;

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { COMPANIES_TABLE_NAME, EMPLOYEES_TABLE_NAME } from "./commons";
import {
  COMPANY_STAGES,
  COMPANY_PRIORITY,
  COMPANY_STATUS,
} from "./interfaces/Company";
import Employee from "./Employees";

// @TODO export them somewhere else
export const defaultCompanyDetails = {
  priority: COMPANY_PRIORITY.NO_PRIORITY,
  status: COMPANY_STATUS.NONE,
};

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
        createdBy: { type: "string" },
        // @TODO Put it in separate table
        concernedPersons: {
          type: "array",
          default: [],
        },
        addresses: { type: "array" },
        assignedTo: { type: "string" },
        assignedBy: { type: "string" },
        priority: { type: "string", default: COMPANY_PRIORITY.NO_PRIORITY },
        status: { type: "string", default: COMPANY_STATUS.NONE },
        details: {
          type: "object",
          default: defaultCompanyDetails,
        },
        stage: { type: "string", default: COMPANY_STAGES.LEAD },
        tags: { type: "string" }, // comma separated strings
        // @TODO typecasting issues
        notes: { type: "array" },
        updatedAt: { type: "string" },
      },
      required: ["companyName"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    assigned_by: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: Employee,
      join: {
        from: `${COMPANIES_TABLE_NAME}.assignedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
    assigned_to: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: Employee,
      join: {
        from: `${COMPANIES_TABLE_NAME}.assignedTo`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return [
      "concernedPersons",
      "activities",
      "assignmentHistory",
      "addresses",
      "notes",
    ];
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

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  COMPANIES_TABLE_NAME,
  EMPLOYEES_TABLE_NAME,
  EMPLOYEE_COMPANY_INTERACTIONS_TABLE,
} from "./commons";
import {
  COMPANY_STAGES,
  COMPANY_PRIORITY,
  COMPANY_STATUS,
} from "./interfaces/Company";
import Employee from "./Employees";

@singleton()
export default class EmployeeCompanyInteractionsModel extends Model {
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
        companyId: { type: "string" },
        employeeId: { type: "string" },
        priority: { type: "string", default: COMPANY_PRIORITY.NO_PRIORITY },
        status: { type: "string", default: COMPANY_STATUS.NONE },
        interactionDetails: { type: "object", default: JSON.stringify({}) },
        stage: { type: "string", default: COMPANY_STAGES.LEAD },
        notes: { type: "array" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["companyName"],
      additionalProperties: false,
    };
  }

  static get validSchemaKeys() {
    return ["priority", "status", "interactionDetails", "stage", "notes"];
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    company: {
      relation: Model.BelongsToOneRelation,
      modelClass: COMPANIES_TABLE_NAME,
      join: {
        from: `${EMPLOYEE_COMPANY_INTERACTIONS_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
    employee: {
      relation: Model.BelongsToOneRelation,
      modelClass: EMPLOYEES_TABLE_NAME,
      join: {
        from: `${EMPLOYEE_COMPANY_INTERACTIONS_TABLE}.employeeId`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["interactionDetails", "notes"];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type IEmployeeCompanyInteractionsModel =
  ModelObject<EmployeeCompanyInteractionsModel>;
export type IEmployeeCompanyInteractionsPaginated =
  IWithPagination<IEmployeeCompanyInteractionsModel>;

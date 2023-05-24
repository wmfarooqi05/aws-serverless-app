import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  COMPANIES_TABLE_NAME,
  EMPLOYEES_TABLE_NAME,
  EMPLOYEE_COMPANY_INTERACTIONS_TABLE,
} from "./commons";
import { COMPANY_PRIORITY, COMPANY_STATUS } from "./interfaces/Company";

export const getDefaultEmployeeInteractionItem = (
  employeeId: string,
  companyId: string
) => {
  return {
    ...defaultInteractionItem,
    employeeId,
    companyId,
  };
};

export const defaultInteractionItem = {
  priority: COMPANY_PRIORITY.NO_PRIORITY,
  status: COMPANY_STATUS.NONE,
  notes: [],
  employeeInteractionDetails: {},
};

export interface IEmployeeCompanyInteraction {
  id?: string;
  companyId: string;
  employeeId: string;
  priority: string;
  status: string;
  employeeInteractionDetails: Object;
  notes: Object[];
}

@singleton()
export default class EmployeeCompanyInteractionsModel extends Model {
  static get tableName() {
    return EMPLOYEE_COMPANY_INTERACTIONS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        email: { type: "string" },
        teamId: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["email", "employeeId"],
      additionalProperties: false,
    };
  }

  static get validSchemaKeys() {
    return ["priority", "status", "employeeInteractionDetails", "notes"];
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
    return ["employeeInteractionDetails", "notes"];
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

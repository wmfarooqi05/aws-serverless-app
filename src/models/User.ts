import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEES_TABLE_NAME } from "./commons";

export enum RolesEnum {
  SALES_REP = "SALES_REP",
  SALES_MANAGER = "SALES_MANAGER",
  REGIONAL_MANAGER = "REGIONAL_MANAGER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

const RolesArray = [
  "SALES_REP",
  "SALES_MANAGER",
  "REGIONAL_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

type GenderType = "Male" | "Female" | "Other";

const GenderArray: GenderType[] = ["Male", "Female", "Other"];

export interface IEmployee {
  id: string;
  name: string;
  picture?: string;
  email: string;
  enabled: boolean;
  jobTitle: string;
  role: string;
  gender: GenderType;
  address: string;
  city: string;
  state: string;
  country: string;
  birthdate: string;
  email_verified: boolean;
  phone_number_verified: boolean;
  phone_number: string;
  reportingManager: string;

  settings: JSON;
  social_profiles: JSON;
  EmployeeStatus: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class EmployeeModel extends Model {
  static get tableName() {
    return EMPLOYEES_TABLE_NAME;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: {
          type: "string",
          minLength: 1,
          maxLength: 70,
        },
        picture: { type: "string" },
        enabled: {
          type: "boolean",
          default: true,
        },
        jobTitle: { type: "string" },
        role: {
          type: "string",
          default: RolesEnum.SALES_REP,
          enum: RolesArray,
        },
        gender: {
          type: "string",
          default: GenderArray[0],
          enum: GenderArray,
        },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        country: { type: "string" },
        birthdate: { type: "string" },
        email_verified: { type: "boolean", default: false },
        phone_number_verified: { type: "boolean", default: false },
        phone_number: { type: "string" },
        reportingManager: { type: "string" },
        settings: { type: "jsonb" },
        social_profiles: { type: "jsonb" },
        EmployeeStatus: { type: "string" },

        timezone: { type: "string" },
        dateFormat: { type: "string" },
        addedBy: { type: "string" }, /// @TODO add relation

        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["id", "name", "email", "role"],
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    addedBy: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: Employee,
      join: {
        from: `${EMPLOYEES_TABLE_NAME}.addedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
    reportingManager: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: Employee,
      join: {
        from: `${EMPLOYEES_TABLE_NAME}.reportingManager`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });

  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type IEmployeeModel = ModelObject<EmployeeModel>;
export type IEmployeePaginated = IWithPagination<IEmployeeModel>;

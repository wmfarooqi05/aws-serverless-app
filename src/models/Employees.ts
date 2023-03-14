import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEES_TABLE_NAME } from "./commons";

export const roleKey = "cognito:groups";

export type IRoles =
  | "SALES_REP_GROUP"
  | "SALES_MANAGER_GROUP"
  | "REGIONAL_MANAGER_GROUP"
  | "ADMIN_GROUP"
  | "SUPER_ADMIN_GROUP";

export const RolesEnum: Readonly<Record<IRoles, number>> = Object.freeze({
  SALES_REP_GROUP: 0,
  SALES_MANAGER_GROUP: 1,
  REGIONAL_MANAGER_GROUP: 2,
  ADMIN_GROUP: 3,
  SUPER_ADMIN_GROUP: 4,
});

export const RolesArray: IRoles[] = [
  "SALES_REP_GROUP",
  "SALES_MANAGER_GROUP",
  "REGIONAL_MANAGER_GROUP",
  "ADMIN_GROUP",
  "SUPER_ADMIN_GROUP",
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
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  phoneNumber: string;
  reportingManager: string;

  settings: JSON;
  socialProfiles: JSON;
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
          default: RolesArray[RolesEnum.SALES_REP_GROUP],
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
        emailVerified: { type: "boolean", default: false },
        phoneNumberVerified: { type: "boolean", default: false },
        phoneNumber: { type: "string" },
        reportingManager: { type: "string" },
        settings: { type: "jsonb" },
        socialProfiles: { type: "jsonb" },
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
      modelClass: EmployeeModel,
      join: {
        from: `${EMPLOYEES_TABLE_NAME}.addedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
    reportingManager: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: EmployeeModel,
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

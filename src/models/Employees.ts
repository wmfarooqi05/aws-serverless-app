import { IWithPagination } from "knex-paginate";
import {
  Model,
  ModelObject,
  RelationMappings,
  RelationMappingsThunk,
} from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEES_TABLE_NAME, EMPLOYEE_TEAMS_TABLE } from "./commons";
import { GenderArray, RolesArray, RolesEnum } from "./interfaces/Employees";
import TeamModel from "./Teams";
@singleton()
export default class EmployeeModel extends Model {
  static get tableName() {
    return EMPLOYEES_TABLE_NAME;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        sub: { type: "string" },
        username: { type: "string" },
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
        addresses: {
          type: "array",
          default: [],
          nullable: true,
        },
        city: { type: "string" },
        state: { type: "string" },
        country: { type: "string" },
        // birthdate: { type: "string", nullable: true },
        emailVerified: { type: "boolean", default: false },
        phoneNumberVerified: { type: "boolean", default: false },
        phoneNumber: { type: "string" },
        reportingManager: { type: "string", nullable: true },
        settings: {
          type: "object",
          default: {},
          nullable: true,
        },
        socialProfiles: {
          type: "object",
          default: {},
          nullable: true,
        },
        EmployeeStatus: { type: "string" },
        teamId: { type: "string" },

        timezone: { type: "string" },
        dateFormat: { type: "string" },
        addedBy: { type: "string" }, /// @TODO add relation

        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["name", "email", "role"],
      additionalProperties: false,
    };
  }

  static get jsonAttributes() {
    return ["addresses", "settings", "socialProfiles"];
  }

  static relationMappings: RelationMappings | RelationMappingsThunk = () => ({
    teams: {
      relation: Model.ManyToManyRelation,
      modelClass: TeamModel,
      join: {
        from: `${EmployeeModel.tableName}.id`,
        through: {
          from: `${EMPLOYEE_TEAMS_TABLE}.employee_id`,
          to: `${EMPLOYEE_TEAMS_TABLE}.team_id`,
          onDelete: "CASCADE",
        },
        to: `${TeamModel.tableName}.id`,
      },
    },
  });
  // static relationMappings = () => ({
  //   addedBy: {
  //     relation: Model.BelongsToOneRelation,
  //     // The related model.
  //     modelClass: EmployeeModel,
  //     join: {
  //       from: `${EMPLOYEES_TABLE_NAME}.addedBy`,
  //       to: `${EMPLOYEES_TABLE_NAME}.id`,
  //     },
  //   },
  //   reportingManager: {
  //     relation: Model.BelongsToOneRelation,
  //     // The related model.
  //     modelClass: EmployeeModel,
  //     join: {
  //       from: `${EMPLOYEES_TABLE_NAME}.reportingManager`,
  //       to: `${EMPLOYEES_TABLE_NAME}.id`,
  //     },
  //   },
  // });

  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type IEmployeeModel = ModelObject<EmployeeModel>;
export type IEmployeePaginated = IWithPagination<IEmployeeModel>;

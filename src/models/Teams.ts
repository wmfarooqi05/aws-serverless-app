import { IWithPagination } from "knex-paginate";
import {
  Model,
  ModelObject,
  RelationMappings,
  RelationMappingsThunk,
} from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEE_TEAMS_TABLE, TEAMS_TABLE } from "./commons";
import EmployeeModel from "./Employees";

export interface ITeam {
  id: string;
  teamName: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class TeamModel extends Model {
  static get tableName() {
    return TEAMS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        teamName: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["teamName", "updatedBy"],
      additionalProperties: false,
    };
  }
  static relationMappings: RelationMappings | RelationMappingsThunk = () => ({
    employees: {
      relation: Model.ManyToManyRelation,
      modelClass: EmployeeModel,
      join: {
        from: `${TeamModel.tableName}.id`,
        through: {
          from: `${EMPLOYEE_TEAMS_TABLE}.team_id`,
          to: `${EMPLOYEE_TEAMS_TABLE}.employee_id`,
          onDelete: "CASCADE",
        },
        to: `${EmployeeModel.tableName}.id`,
      },
    },
  });
}

export type ITeamModel = ModelObject<TeamModel>;
export type ITeamPaginated = IWithPagination<ITeamModel>;

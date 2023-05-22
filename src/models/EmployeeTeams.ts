import { IWithPagination } from "knex-paginate";
import {
  Model,
  ModelObject,
  RelationMappings,
  RelationMappingsThunk,
} from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEE_TEAMS_TABLE } from "./commons";
import TeamModel from "./Teams";
import EmployeeModel from "./Employees";

export interface IEmployeeTeam {
  teamId: string;
  employeeId: string;
}

@singleton()
export default class EmployeeTeamsModel extends Model {
  static get tableName() {
    return EMPLOYEE_TEAMS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        teamId: { type: "string" },
      },
      required: ["employeeId", "teamId"],
      additionalProperties: false,
    };
  }

  static relationMappings: RelationMappings | RelationMappingsThunk = () => ({
    teams: {
      relation: Model.HasManyRelation,
      modelClass: TeamModel,
      join: {
        from: `${EmployeeTeamsModel.tableName}.team_id`,
        to: `${TeamModel.tableName}.id`,
      },
    },
    employees: {
      relation: Model.HasManyRelation,
      modelClass: EmployeeModel,
      join: {
        from: `${EmployeeTeamsModel.tableName}.employee_id`,
        to: `${EmployeeModel.tableName}.id`,
      },
    },
  });
}

export type IEmployeeTeamsModel = ModelObject<EmployeeTeamsModel>;
export type IEmployeeTeamsModelPaginated = IWithPagination<IEmployeeTeamsModel>;

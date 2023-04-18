import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { TEAMS_TABLE } from "./commons";

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
}

export type ITeamModel = ModelObject<TeamModel>;
export type ITeamPaginated = IWithPagination<ITeamModel>;

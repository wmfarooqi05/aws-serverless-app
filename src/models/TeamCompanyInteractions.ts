import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { TEAM_COMPANY_INTERACTIONS_TABLE } from "./commons";
import { COMPANY_STAGES } from "./interfaces/Company";
import { IEmployeeJwt } from "./interfaces/Employees";
import TeamModel, { ITeam } from "./Teams";
import CompanyModel from "./Company";

export const getDefaultTeamInteractionItem = (
  employee: IEmployeeJwt,
  companyId: string
) => {
  return {
    companyId,
    teamId: employee.currentTeamId ?? employee.teamId[0],
    stage: COMPANY_STAGES.LEAD,
    teamInteractionDetails: {},
  };
};

export interface ITeamCompanyInteraction {
  id?: string;
  companyId: string;
  teamId: string;
  stage: COMPANY_STAGES;
  teamInteractionDetails: Object;
  team?: ITeam;
}

@singleton()
export default class TeamCompanyInteractionsModel extends Model {
  static get tableName() {
    return TEAM_COMPANY_INTERACTIONS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        companyId: { type: "string" },
        teamId: { type: "string" },
        stage: { type: "string", default: COMPANY_STAGES.LEAD },
        teamInteractionDetails: { type: "object", default: JSON.stringify({}) },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["companyId", "teamId", "stage"],
      additionalProperties: false,
    };
  }

  static get validSchemaKeys() {
    return ["teamId", "stage", "teamInteractionDetails"];
  }

  static get jsonAttributes() {
    return ["teamInteractionDetails"];
  }

  static modifiers = {
    filterByMyTeam(query, teamId) {
      query.where("teamId", teamId);
    },
  };

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    company: {
      relation: Model.BelongsToOneRelation,
      modelClass: CompanyModel,
      join: {
        from: `${TeamCompanyInteractionsModel.tableName}.companyId`,
        to: `${CompanyModel.tableName}.id`,
      },
    },
    team: {
      relation: Model.BelongsToOneRelation,
      modelClass: TeamModel,
      join: {
        from: `${TeamCompanyInteractionsModel.tableName}.teamId`,
        to: `${TeamModel.tableName}.id`,
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

export type ITeamCompanyInteractionsModel =
  ModelObject<TeamCompanyInteractionsModel>;
export type ITeamCompanyInteractionsPaginated =
  IWithPagination<ITeamCompanyInteractionsModel>;

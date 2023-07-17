import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import {
  COMPANIES_TABLE_NAME,
  TEAM_COMPANY_INTERACTIONS_TABLE,
  TEAMS_TABLE,
} from "./commons";
import { COMPANY_STAGES } from "./interfaces/Company";
import { IEmployeeJwt } from "./interfaces/Employees";

export const getDefaultTeamInteractionItem = (
  employee: IEmployeeJwt,
  companyId: string
) => {
  return {
    companyId,
    teamId: employee.teamId,
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

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    company: {
      relation: Model.BelongsToOneRelation,
      modelClass: COMPANIES_TABLE_NAME,
      join: {
        from: `${TEAM_COMPANY_INTERACTIONS_TABLE}.companyId`,
        to: `${COMPANIES_TABLE_NAME}.id`,
      },
    },
    team: {
      relation: Model.BelongsToOneRelation,
      modelClass: TEAMS_TABLE,
      join: {
        from: `${TEAM_COMPANY_INTERACTIONS_TABLE}.teamId`,
        to: `${TEAMS_TABLE}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["teamInteractionDetails"];
  }

  static modifiers = {
    filterByMyTeam(query, teamId) {
      query.where("teamId", teamId);
    },
  };

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

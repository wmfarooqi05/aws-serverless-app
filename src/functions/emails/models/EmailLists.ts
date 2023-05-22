import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { IWithPagination } from "knex-paginate";
import {
  EMAIL_ADDRESSES_TABLE,
  EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE,
  EMAIL_LIST_TABLE,
} from "./commons";
import ContactEmailsModel from "./EmailAddresses";
import TeamModel from "@models/Teams";
import { TEAMS_TABLE } from "@models/commons";

export interface IEmailList {
  id?: string;
  name: string;
  teamId: string;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

@singleton()
export default class EmailListModel extends Model {
  static get tableName() {
    return EMAIL_LIST_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        teamId: { type: "string" },
        nameCode: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["name", "teamId", "updatedBy", "nameCode"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    emailAddresses: {
      relation: Model.ManyToManyRelation,
      // The related model.
      modelClass: ContactEmailsModel,
      join: {
        from: `${EMAIL_LIST_TABLE}.id`,
        through: {
          from: `${EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE}.email_list_id`,
          to: `${EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE}.email_address_id`,
          onDelete: "NO ACTION",
        },
        to: `${EMAIL_ADDRESSES_TABLE}.id`,
      },
    },
    emailListToTeamId: {
      relation: Model.BelongsToOneRelation,
      modelClass: TeamModel,
      join: {
        from: `${EMAIL_LIST_TABLE}.teamId`,
        to: `${TEAMS_TABLE}.id`,
      },
    },
  });
}

export type IEmailListModel = ModelObject<EmailListModel>;
export type IEmailListPaginated = IWithPagination<IEmailListModel>;

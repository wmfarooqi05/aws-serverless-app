import { IWithPagination } from "knex-paginate";
import {
  Model,
  ModelObject,
  RelationMappings,
  RelationMappingsThunk,
} from "objection";
import { singleton } from "tsyringe";
import { EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE } from "./commons";
import EmailAddressesModel from "./EmailAddresses";
import EmailListModel from "./EmailLists";

export interface IEmployeeTeam {
  teamId: string;
  employeeId: string;
}

@singleton()
export default class EmailAddressToEmailListModel extends Model {
  static get tableName() {
    return EMAIL_ADDRESS_TO_EMAIL_LIST_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        emailAddressId: { type: "string" },
        emailListId: { type: "string" },
      },
      required: ["emailAddressId", "emailListId"],
      additionalProperties: false,
    };
  }

  static relationMappings: RelationMappings | RelationMappingsThunk = () => ({
    emailAddresses: {
      relation: Model.HasManyRelation,
      modelClass: EmailAddressesModel,
      join: {
        from: `${EmailAddressToEmailListModel.tableName}.email_address_id`,
        to: `${EmailAddressesModel.tableName}.id`,
      },
    },
    emailLists: {
      relation: Model.HasManyRelation,
      modelClass: EmailListModel,
      join: {
        from: `${EmailAddressToEmailListModel.tableName}.email_list_id`,
        to: `${EmailListModel.tableName}.id`,
      },
    },
  });
}

export type IEmailAddressToEmailListModel =
  ModelObject<EmailAddressToEmailListModel>;
export type IEmailAddressToEmailListModelPaginated =
  IWithPagination<IEmailAddressToEmailListModel>;

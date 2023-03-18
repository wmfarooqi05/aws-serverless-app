import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import Activity, { ACTIVITIES_TABLE } from "./Activity";

export const LINKED_ACTIVITIES_TABLE = process.env.LINKED_ACTIVITIES_TABLE || "linked_activities";

enum LINKED_TYPE {
  DUPLICATES = "DUPLICATES",
  DUPLICATED_BY = "DUPLICATED_BY",
  BLOCKS = "BLOCKS",
  BLOCKED_BY = "BLOCKED_BY",
  DELAYED_BY = "DELAYED_BY",
  DELAYS = "DELAYS",
}

export interface ILinkedActivity {
  id: string;
  title: LINKED_TYPE;
  issueA: string;
  issueB: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class LinkedActivityModel extends Model {
  static get tableName() {
    return LINKED_ACTIVITIES_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }


  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        issueA: { type: "string" },
        issueB: { type: "string" },
        title: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["title", "issueA", "issueB", "updatedBy"],
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    activityToCompany: {
      relation: Model.BelongsToOneRelation,
      modelClass: Activity,
      join: {
        from: `${LINKED_ACTIVITIES_TABLE}.issueA`,
        to: `${ACTIVITIES_TABLE}.id`,
      },
    },
    activityToEmployee: {
      relation: Model.BelongsToOneRelation,
      modelClass: Activity,
      join: {
        from: `${LINKED_ACTIVITIES_TABLE}.issueA`,
        to: `${ACTIVITIES_TABLE}.id`,
      },
    },
  });

}

export type ILinkedActivityModel = ModelObject<LinkedActivityModel>;

import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { UPDATE_HISTORY_TABLE } from "./commons";

@singleton()
export default class UpdateHistoryModel extends Model {
  static get tableName() {
    return UPDATE_HISTORY_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        tableRowId: { type: "string" },
        tableName: { type: "string" },
        field: { type: "string" },
        value: { type: "string" }, // this will be beneficial when we have json key
        // old and new value will represent whole json, but value will tell what was the actual value
        old_value: { type: "string" },
        new_value: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "tableRowId",
        "tableName",
        "field",
        "value",
        "old_value",
        "new_value",
      ],
      additionalProperties: false,
    };
  }
}

export type IUpdateHistoryModel = ModelObject<UpdateHistoryModel>;

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
        subField: { type: "string" },
        oldValue: { type: "string" },
        newValue: { type: "string" }, // no idea if supporting this two
        actionType: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["tableName", "actionType", "updatedBy"],
      additionalProperties: false,
    };
  }
}

export type IUpdateHistoryModel = ModelObject<UpdateHistoryModel>;

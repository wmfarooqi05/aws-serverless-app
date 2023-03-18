import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { GLOBAL_SETTINGS_TABLE } from "./commons";

export interface IGlobalSetting {
  id: string;
  title: string;
  values: string;
  createdAt: string;
  updatedAt: string;
}
@singleton()
export default class GlobalSettingsModel extends Model {
  static get tableName() {
    return GLOBAL_SETTINGS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }


  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        values: { type: "object", default: {} },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["title", "value"],
      additionalProperties: false,
    };
  }
}

export type IGlobalSettingModel = ModelObject<GlobalSettingsModel>;

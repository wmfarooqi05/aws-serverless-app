import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { ACCESS_CONTROL_TABLE } from "./commons";

export interface IGlobalSetting {
  id: string;
  title: string;
  values: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class GroupModel extends Model {
  static get tableName() {
    return ACCESS_CONTROL_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        name: {
          type: "string",
          required: true,
        },
        role: {
          type: "string",
          enum: ["super_manager", "manager", "team_lead"],
          required: true,
        },
        employees: {
          type: "array",
          required: true,
        },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      // required: ["title", "value"],
      additionalProperties: false,
    };
  }
}

export type IGlobalSettingModel = ModelObject<AccessControlModel>;

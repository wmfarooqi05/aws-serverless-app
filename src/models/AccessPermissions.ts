
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { ACCESS_PERMISSIONS_TABLE } from "./commons";

export interface IGlobalSetting {
  id: string;
  title: string;
  values: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class AccessPermissions extends Model {
  static get tableName() {
    return ACCESS_PERMISSIONS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }


  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        // id SERIAL PRIMARY KEY,
        // resource_id INTEGER NOT NULL,
        // attribute VARCHAR(255) NOT NULL,
        // value VARCHAR(255) NOT NULL,
        // permission VARCHAR(10) NOT NULL
        id: {
          type: "string",
        },

        // SET1
        resourceId: {
          type: "string"
        },
        attribute: {
          type: "string",
        },
        value: {
          type:"string"
        },
        permissions: {
          type:"string"
        },

        // SET2
        subject: {
          type: "string",
        },
        action: {
          type: "string",
        },
        target: {
          type: "string",
        },
        effect: {
          type: "string",
        },
        conditions: {
          type: "string",
        },
        // additional
        role: {
          type: "string"
        },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      // required: ["title", "value"],
      additionalProperties: false,
    };
  }
}

export type IGlobalSettingModel = ModelObject<AccessControlPoliciesModel>;

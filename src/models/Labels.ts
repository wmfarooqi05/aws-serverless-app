import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";

export const LABELS_TABLE = process.env.LABELS_TABLE || "labels";

export interface ILabel {
  id: string;
  title: string;
  values: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class LabelModel extends Model {
  static get tableName() {
    return LABELS_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        values: { type: "string" }, // snake cased value
        updatedBy: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["title", "value", "updatedBy"],
      additionalProperties: false,
    };
  }
}

export type ILabelModel = ModelObject<LabelModel>;

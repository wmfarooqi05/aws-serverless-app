import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMAIL_OPT_OUT_TABLE } from "./commons";

@singleton()
export class OptOutModel extends Model {
  static get tableName() {
    return EMAIL_OPT_OUT_TABLE;
  }

  static get idColumn() {
    return "id";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["email"],

      properties: {
        id: { type: "integer" },
        email: {
          type: "string",
          format: "email",
          minLength: 1,
          maxLength: 255,
        },
        reason: { type: "string", minLength: 1, maxLength: 255 },
        created_at: { type: "timestamp" },
        updated_at: { type: "timestamp" },
      },
    };
  }
}

export type IOptOutModel = ModelObject<OptOutModel>;
export type IOptOutPaginated = IWithPagination<IOptOutModel>;

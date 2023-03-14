import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { AUTH_TOKEN_TABLE } from "./commons";

export interface IAuthToken {
  id: string;
  employeeId: string;
  tokenType: string;
  tokenIssuer: string;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

@singleton()
export default class AuthTokenModel extends Model {
  static get tableName() {
    return AUTH_TOKEN_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        employeeId: { type: "string" },
        tokenType: { type: "string" },
        tokenIssuer: { type: "string" },
        accessToken: { type: "string" },
        idToken: { type: "string" },
        refreshToken: { type: "string" },
        expiryDate: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "employeeId",
        "tokenType",
        "tokenIssuer",
        "accessToken",
        "expiryDate",
      ],
      additionalProperties: false,
    };
  }
}

export type IAuthTokenModel = ModelObject<AuthTokenModel>;

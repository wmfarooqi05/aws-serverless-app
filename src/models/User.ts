import { Model } from "objection";

enum RolesEnum {
  "SALES_REP",
  "SALES_MANAGER",
  "REGIONAL_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
}

const RolesArray = [
  "SALES_REP",
  "SALES_MANAGER",
  "REGIONAL_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

const GenderArray = ['Male', 'Female', 'Other'];

export class User extends Model {
  static get tableName() {
    return "users";
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: {
          type: "string",
          minLength: 1,
          maxLength: 70,
        },
        enabled: {
          type: "boolean",
          default: true,
        },
        jobTitle: { type: "string" },
        role: {
          type: "string",
          default: RolesEnum.SALES_REP,
          enum: RolesArray,
        },
        gender: {
          type: "string",
          default: GenderArray[0],
          enum: GenderArray,
        },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        country: { type: "string" },
        birthdate: { type: "string" },
        email_verified: { type: "boolean", default: false },
        phone_number_verified: { type: "boolean", default: false },
        phone_number: { type: "string" },
        settings: { type: "jsonb" },
        social_profiles: { type: "jsonb" },
        UserStatus: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["id", "firstName", "lastName", "email", "role"],
      additionalProperties: false,
    };
  }

  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
};

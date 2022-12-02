import { Model, ModelObject } from "objection";
import { User } from "./User";

export default class Lead extends Model {
  static get tableName() {
    return "leads";
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        companyName: { type: "string" },
        phoneNumber: {
          type: "string",
          // minLength: 10,
          // maxLength: 11,
        },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        country: { type: "string" },
        postalCode: { type: "string" },
        concernedPersons: {
          type: "array",
          items: { type: "object" },
          default: [],
        },
        remarks: {
          type: "array",
          items: { type: "object" },
          default: [],
        },
        assignedTo: { type: "string" },
        assignedBy: { type: "string" },
        assignmentHistory: {
          type: "array",
          items: { type: "object" },
          default: [],
        },
        updatedAt: { type: "string" },
      },
      required: ["companyName"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    assigned_by: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: User,
      join: {
        from: "leads1.assignedBy",
        to: "users.id",
      },
    },
    assigned_to: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: User,
      join: {
        from: "leads1.assignedTo",
        to: "users.id",
      },
    },
  });

  static get jsonAttributes() {
    return ["concernedPersons", "remarks", "assignmentHistory"];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type ILead = ModelObject<Lead>;

// export lead_public_fields = ['company_name', 'phone_number', 'address', 'city', 'county', ]
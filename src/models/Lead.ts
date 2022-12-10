import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import User, { USERS_TABLE_NAME } from "./User";

interface IWithPagination<T = any> {
  data: T;
  pagination: IPagination;
}

interface IPagination {
  total?: number;
  lastPage?: number;
  currentPage: number;
  perPage: number;
  from: number;
  to: number;
}

console.log('process.env', process.env);
export const LEADS_TABLE_NAME = process.env.LEAD_TABLE || "leads";

export interface ILead {
  id: string;
  companyName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  concernedPersons: IConcernedPerson[];
  assignedTo: string;
  assignedBy: string;
  assignmentHistory: JSON;
  updatedAt: string;
}

@singleton()
export default class Lead extends Model {
  static get tableName() {
    return LEADS_TABLE_NAME;
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
        from: `${LEADS_TABLE_NAME}.assignedBy`,
        to: `${USERS_TABLE_NAME}.id`,
      },
    },
    assigned_to: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: User,
      join: {
        from: `${LEADS_TABLE_NAME}.assignedTo`,
        to: `${USERS_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["concernedPersons", "conversations", "assignmentHistory"];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type ILeadModel = ModelObject<Lead>;
export type ILeadPaginated = IWithPagination<ILeadModel>;

// @TODO export them somewhere else
export interface IAssignmentHistory {
  assignedTo?: string;
  assignedBy: string;
  comments?: string;
  date: string;
}

export interface IConcernedPerson {
  id: string;
  name: string;
  designation: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

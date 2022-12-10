import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import Lead, { IConcernedPerson, LEADS_TABLE_NAME } from "./Lead";
import User, { IUser, USERS_TABLE_NAME } from "./User";

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

export const CONVERSATIONS_TABLE_NAME = process.env.CONVERSATIONS_TABLE || "conversations1";

export interface IConversation {
  id: string;
  leadId: string;
  callDetails?: {
    phoneNumber: string;
    callDuration: number; // seconds
    date: string;
  };
  emailDetails?: {
    email: string;
    date: string;
  },
  employeeId: string;
  reportingManagerId: string;
  concernedPersonDetails: Pick<IConcernedPerson, 'id' | 'name' | 'email'>;
  remarks: IRemarks[],
  createdAt: string;
  updatedAt: string;
}


@singleton()
export default class Conversation extends Model {
  static get tableName() {
    return CONVERSATIONS_TABLE_NAME;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        leadId: { type: "string" },
        phoneNumber: { type: "string" },
        employeeId: { type: "string" },
        reportingManagerId: { type: "string" },
        remarks: {
          type: "array",
          default: [],
        },
        callDetails: {
          type: "object",
          default: {},
        },
        emailDetails: {
          type: "object",
          default: {},
        },
        concernedPersonDetails: {
          type: "object",
          default: {},
        },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["leadId", "remarks", "employeeId", "concernedPersonDetails"],
      additionalProperties: false,
    };
  }

  // This object defines the relations to other models. The relationMappings
  // property can be a thunk to prevent circular dependencies.
  static relationMappings = () => ({
    conversationToLead: {
      relation: Model.BelongsToOneRelation,
      modelClass: Lead,
      join: {
        from: `${CONVERSATIONS_TABLE_NAME}.leadId`,
        to: `${LEADS_TABLE_NAME}.id`,
      },
    },
    conversationToEmployee: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: `${CONVERSATIONS_TABLE_NAME}.employeeId`,
        to: `${USERS_TABLE_NAME}.id`,
      },
    },
    conversationToManager: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: `${CONVERSATIONS_TABLE_NAME}.reportingManagerId`,
        to: `${USERS_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["callDetails", "emailDetails", "remarks", "employeeId"];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type IConversationModel = ModelObject<Conversation>;
export type IConversationPaginated = IWithPagination<IConversationModel>;

export interface IRemarks {
  id: string;
  conversationId: string;
  remarksText: string;
  employeeDetails: Pick<IUser, 'name' | 'email' | 'id'>;
  reportingManager?: Pick<IUser, 'name' | 'email' | 'id'>;
  createdAt: string;
  updatedAt: string;
};

import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { COMPANIES_TABLE_NAME, USERS_TABLE_NAME } from "./commons";
import User from "./User";

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
  phoneNumbers: string[];
  emails: string[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAddress {
  title: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: number;
}

export interface ICompany {
  id: string;
  companyName: string;
  emails: string[];
  phoneNumbers: string[];
  addresses: IAddress[];
  concernedPersons: IConcernedPerson[];
  assignedTo: string;
  assignedBy: string;
  assignmentHistory: JSON;
  updatedAt: string;
  notes: INotes[];
}

export enum COMPANY_STAGES {
  LEAD = "LEAD",
  PROSPECT = "PROSPECT",
  OPPORTUNITY = "OPPORTUNITY", // maybe contact or client
}

export enum TASK_STATUS {
  ICEBOX = "ICEBOX",
  BACK_LOG = "BACK_LOG",
  TO_DO = "TO_DO",
  DELAYED_BY_CLIENT = "DELAYED_BY_CLIENT",
  DELAYED_BY_MANAGER = "DELAYED_BY_MANAGER",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  BLOCKED = "BLOCKED",
  WONT_DO = "WONT_DO",
  NOT_VALID = "NOT_VALID", // @TODO improve
  DONE = "DONE",
}

// @TODO v2: Move this to a separate table
export enum PRIORITY {
  NO_PRIORITY = "NO_PRIORITY",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRUCIAL = "CRUCIAL",
}

@singleton()
export default class Company extends Model {
  static get tableName() {
    return COMPANIES_TABLE_NAME;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        companyName: { type: "string" },
        // @TODO Put it in separate table
        concernedPersons: {
          type: "array",
          default: [],
        },
        addresses: { type: "array" },
        assignedTo: { type: "string" },
        assignedBy: { type: "string" },
        // @TODO move this to log history
        assignmentHistory: {
          type: "array",
          items: { type: "object" },
          default: [],
        },
        priority: { type: "string", default: PRIORITY.NO_PRIORITY },
        taskStatus: { type: "string", default: TASK_STATUS.ICEBOX },
        stage: { type: "string", default: COMPANY_STAGES.LEAD },
        tags: { type: "string" }, // comma separated strings
        // @TODO typecasting issues
        // notes: {
        //   type: ["array", "null"],
        //   items: { type: "object" },
        //   default: JSON.stringify([]),
        // },
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
        from: `${COMPANIES_TABLE_NAME}.assignedBy`,
        to: `${USERS_TABLE_NAME}.id`,
      },
    },
    assigned_to: {
      relation: Model.BelongsToOneRelation,
      // The related model.
      modelClass: User,
      join: {
        from: `${COMPANIES_TABLE_NAME}.assignedTo`,
        to: `${USERS_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["concernedPersons", "activities", "assignmentHistory", "addresses"];
  }
  // $beforeInsert() {
  //   this.createdAt = new Date();
  // }

  // $beforeUpdate() {
  //   this.updatedAt = new Date();
  // }
}

export type ICompanyModel = ModelObject<Company>;
export type ICompanyPaginated = IWithPagination<ICompanyModel>;

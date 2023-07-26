import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEES_TABLE_NAME, JOBS_TABLE } from "./commons";
import { SQSEventType } from "./interfaces/Reminders";
import EmployeeModel from "./Employees";

export type JOB_STATUS =
  | "SUCCESSFUL"
  | "QUEUED"
  | "FAILED"
  | "PENDING"
  | "IN_PROGRESS";
export interface IJob {
  id?: string;
  uploadedBy?: string;
  jobType: SQSEventType;
  details: Object;
  jobResult?: Object;
  jobStatus?: JOB_STATUS;
  createdAt?: string;
  updatedAt?: string;
}

@singleton()
export default class JobsModel extends Model {
  static get tableName() {
    return JOBS_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        uploadedBy: { type: "string" },
        details: { type: "object" },
        jobType: { type: "string" },
        jobResult: { type: "object", default: {} },
        jobStatus: { type: "string", default: "PENDING" as JOB_STATUS },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["jobType"],
      additionalProperties: false,
    };
  }

  static get jsonAttributes() {
    return ["details", "jobResult"];
  }

  static relationMappings = () => ({
    uploader: {
      relation: Model.BelongsToOneRelation,
      modelClass: EmployeeModel,
      join: {
        from: `${JOBS_TABLE}.uploadedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });
}

export type IJobsModel = ModelObject<JobsModel>;
export type IJobsPaginated = IWithPagination<IJobsModel>;

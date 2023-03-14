import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { JOBS_RESULTS_TABLE, EMPLOYEES_TABLE_NAME } from "./commons";
import EmployeeModel from "./Employees";

export interface IJobsResults {
  id?: string;
  uploadedBy: string;
  jobType: string;
  jobResultUrl: string;
  createdAt?: string;
  summary?: string;
  resultType?: string;
}

@singleton()
export default class JobsResultsModel extends Model {
  static get tableName() {
    return JOBS_RESULTS_TABLE;
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        uploadedBy: { type: "string" },
        jobType: { type: "string" },
        jobResultUrl: { type: "string" }, // snake cased value
        summary: { type: "string" },
        resultType: { type: "string" },
        createdAt: { type: "string" },
      },
      required: ["uploadedBy", "jobType", "jobResultUrl"],
      additionalProperties: false,
    };
  }
  static relationMappings = () => ({
    uploaded_by: {
      relation: Model.BelongsToOneRelation,
      modelClass: EmployeeModel,
      join: {
        from: `${JOBS_RESULTS_TABLE}.uploadedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });
}

export type IJobsResultsModel = ModelObject<JobsResultsModel>;

import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { JOBS_TABLE, EMPLOYEES_TABLE_NAME } from "../commons";
import EmployeeModel from "../Employees";

interface IJobs {
  id?: string;
  uploadedBy: string;
  jobType: string;
  jobResultUrl?: string;
  resultPayload?: object;
  createdAt?: string;
  summary?: string;
  resultType?: string;
  details: Object;
}

@singleton()
class JobsModel extends Model {
  static get tableName() {
    return JOBS_TABLE;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        uploadedBy: { type: "string" },
        jobType: { type: "string" },
        summary: { type: "string" },
        details: { type: "object" },
        result: { type: "object" },
        jobStatus: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["uploadedBy", "jobType"],
      additionalProperties: false,
    };
  }
  static relationMappings = () => ({
    uploaded_by: {
      relation: Model.BelongsToOneRelation,
      modelClass: EmployeeModel,
      join: {
        from: `${JOBS_TABLE}.uploadedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["details", "result"];
  }
}

type IJobsModel = ModelObject<JobsModel>;

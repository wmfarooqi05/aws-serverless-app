import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { JOBS_TABLE, JOB_EXECUTION_HISTORY } from "./commons";
import JobsModel, { IJob, JOB_STATUS } from "./Jobs";

export interface IJobExecutionHistory {
  id?: string;
  jobId: string;
  jobStatus?: JOB_STATUS;
  jobResult?: any;
  executionTimestamp?: string;
  retryCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type IJobExecutionData = Pick<
  IJobExecutionHistory,
  "jobResult" | "jobStatus"
>;

@singleton()
export default class JobExecutionHistoryModel extends Model {
  static get tableName() {
    return JOB_EXECUTION_HISTORY;
  }

  static get columnNames(): string[] {
    return Object.keys(this.jsonSchema.properties);
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        id: { type: "string" },
        jobId: { type: "string" },
        jobStatus: { type: "string" },
        jobResult: { type: "string" },
        executionTimestamp: { type: "string" },
        retryCount: { type: "number", default: 0 },
      },
      additionalProperties: false,
    };
  }

  static relationMappings = () => ({
    parentJob: {
      relation: Model.HasOneRelation,
      // The related model.
      modelClass: JobsModel,
      join: {
        from: `${JOB_EXECUTION_HISTORY}.jobId`,
        to: `${JOBS_TABLE}.id`,
      },
    },
  });

  static get jsonAttributes() {
    return ["result"];
  }

  static afterUpdate({ inputItems }) {
    const entry: IJobExecutionHistory = inputItems[0];
    return JobsModel.query().patchAndFetchById(entry.jobId, {
      jobResult: entry.jobResult,
      jobStatus: entry.jobResult,
      lastExecutionTimestamp: entry.executionTimestamp,
    } as Partial<IJob>);
  }
}

export type IJobExecutionHistoryModel = ModelObject<JobExecutionHistoryModel>;
export type IJobExecutionHistoryPaginated =
  IWithPagination<IJobExecutionHistoryModel>;

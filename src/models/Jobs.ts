import { IWithPagination } from "knex-paginate";
import { Model, ModelObject } from "objection";
import { singleton } from "tsyringe";
import { EMPLOYEES_TABLE_NAME, JOBS_TABLE } from "./commons";
import { SQSEventType } from "./interfaces/Reminders";
import EmployeeModel from "./Employees";
import JobExecutionHistoryModel, {
  IJobExecutionHistory,
} from "./JobExecutionHistory";
import moment from "moment-timezone";
import { CustomError } from "@helpers/custom-error";

export type JOB_STATUS =
  | "SUCCESSFUL"
  | "QUEUED"
  | "FAILED"
  | "PENDING"
  | "IN_PROGRESS"
  | "UNPROCESSED";
export interface IJob {
  id?: string;
  uploadedBy?: string;
  jobType: SQSEventType;
  details: Object;
  jobResult?: Object;
  jobStatus?: JOB_STATUS;
  lastExecutionTimestamp: string;
  lastExecutedJobId: string;
  retryCount: number;
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
        createdAt: { type: "string" },
        updatedAt: { type: "string" },

        jobResult: { type: "object", default: {} },
        jobStatus: { type: "string", default: "PENDING" as JOB_STATUS },
        retryCount: { type: "number", default: -1 }, // when job is not executed
        lastExecutionTimestamp: { type: "string" },
        lastExecutedJobId: { type: "string" },
      },
      required: ["jobType"],
      additionalProperties: false,
    };
  }

  static get jsonAttributes() {
    return ["details", "jobResult"];
  }

  static addExecutionHistory = async (
    jobId: string,
    jobStatus: JOB_STATUS = "IN_PROGRESS",
    executionTimestamp: string = moment().utc().format()
  ): Promise<{
    jobItem: IJob;
    jobCurrentExecutionItem: IJobExecutionHistory;
  }> => {
    const jobItem: IJob = await JobsModel.query().findById(jobId);
    if (!jobItem) {
      throw new CustomError(`Job Item for id ${jobId} not found`, 400);
    }

    if (process.env.STAGE !== "local" && jobItem.jobStatus === "SUCCESSFUL") {
      console.log(
        `Job with id: ${jobId} has already been executed successfully`
      );
      return { jobItem, jobCurrentExecutionItem: null };
    }

    const retryCount = jobItem.retryCount + 1;
    const jobCurrentExecutionItem: IJobExecutionHistory =
      await JobsModel.relatedQuery("executionHistory").insert({
        jobId,
        jobStatus,
        executionTimestamp,
        retryCount,
      } as IJobExecutionHistory);

    const patchJobItem: Partial<IJob> = {
      lastExecutedJobId: jobCurrentExecutionItem.id,
      lastExecutionTimestamp: executionTimestamp,
      jobStatus,
      retryCount,
    };
    await JobsModel.query().patchAndFetchById(jobId, patchJobItem);

    return {
      jobItem: {
        ...jobItem,
        ...patchJobItem,
      },
      jobCurrentExecutionItem,
    };
  };

  static relationMappings = () => ({
    uploader: {
      relation: Model.BelongsToOneRelation,
      modelClass: EmployeeModel,
      join: {
        from: `${JOBS_TABLE}.uploadedBy`,
        to: `${EMPLOYEES_TABLE_NAME}.id`,
      },
    },
    executionHistory: {
      relation: Model.HasManyRelation,
      modelClass: JobExecutionHistoryModel,
      join: {
        from: `${JOBS_TABLE}.id`,
        to: `${JobExecutionHistoryModel.tableName}.jobId`,
      },
    },
  });
}

export type IJobsModel = ModelObject<JobsModel>;
export type IJobsPaginated = IWithPagination<IJobsModel>;

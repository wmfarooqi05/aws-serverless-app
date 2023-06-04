import { SQSEventType } from "@models/interfaces/Reminders";
import { randomUUID } from "crypto";
import { Schema, model, type } from "dynamoose";
import { AnyItem } from "dynamoose/dist/Item";
import moment from "moment-timezone";

export type JOB_STATUS = "SUCCESSFUL" | "QUEUED" | "FAILED" | "PENDING";
export interface IJobData extends AnyItem {
  jobId: string;
  uploadedBy: string;
  jobType: SQSEventType;
  details: Object;
  result?: string;
  jobStatus: JOB_STATUS;
  createdAt?: string;
  updatedAt?: string;
}

// Define the schema for the first table
export const JobsSchema = new Schema(
  {
    jobId: {
      type: String,
      hashKey: true,
      default: randomUUID(),
    },
    uploadedBy: {
      required: true,
      type: String,
    },
    jobType: {
      required: true,
      type: String,
    },
    summary: String,
    details: {
      type: Object,
    },
    result: {
      type: Object,
    },
    jobStatus: {
      type: String,
      required: true,
    },
    createdAt: {
      type: String,
      default: moment().utc().format(),
    },
    updatedAt: {
      type: String,
      default: moment().utc().format(),
    },
  },
  {
    saveUnknown: true,
  }
);

// Create the first table model
export const JobsModel = model("Jobs", JobsSchema);

export default JobsModel;

import { randomUUID } from "crypto";
import { Schema, model } from "dynamoose";
import moment from "moment-timezone";

// Define the schema for the first table
export const JobsSchema = new Schema(
  {
    id: {
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
    result: Object,
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

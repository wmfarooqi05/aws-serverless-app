import "reflect-metadata";
import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";
import { container } from "tsyringe";
import { JobService } from "./service";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";

const getAllJobsHandler = async (event) => {
  try {
    const jobs = await container
      .resolve(JobService)
      .getAllJobs(event.employee, event.body);
    return formatJSONResponse(jobs, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getAllJobs = checkRolePermission(
  getAllJobsHandler,
  "ACTIVITY_READ_ALL"
);

import "reflect-metadata";

import { IActivity } from "@models/interfaces/Activity";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { ActivityService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "tsyringe";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

const getActivitiesHandler: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  try {
    const activities = await container
      .resolve(ActivityService)
      .getAllActivities(
        event?.employee?.sub,
        // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
        event.query || {}
      );
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getAllActivitiesByCompanyHandler = async (event) => {
  try {
    const { companyId } = event.params;
    const activities = await container
      .resolve(ActivityService)
      .getAllActivitiesByCompany(
        event?.employee?.sub,
        companyId,
        event.query || {}
      );
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getMyActivitiesHandler: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  try {
    const activities = await container
      .resolve(ActivityService)
      .getMyActivities(event?.employee, event.query || {});
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getTopActivitiesHandler = async (event) => {
  const { companyId } = event.params;
  try {
    const activities = await container
      .resolve(ActivityService)
      .getTopActivities(event?.employee?.sub, companyId);
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getActivityByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  const { activityId } = event.params;
  try {
    const activities = await container.resolve(ActivityService).getActivityById(
      event?.employee?.sub,
      // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
      activityId
    );
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getMyStaleActivityByStatusHandler = async (event) => {
  try {
    const activities = await container
      .resolve(ActivityService)
      .getMyStaleActivities(event?.employee, event.query || {});
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getEmployeeStaleActivityByStatusHandler = async (event) => {
  try {
    const activities = await container
      .resolve(ActivityService)
      .getEmployeeStaleActivityByStatus(event?.employee, event.query || {});
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createActivityHandler: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  try {
    const newActivity = await container.resolve(ActivityService).createActivity(
      event?.employee,
      // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3", // @TODO replace with auth
      event.body
    );
    return formatJSONResponse(newActivity, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateActivityHandler = async (event) => {
  try {
    const { activityId } = event.params;

    const updatedActivity = await container
      .resolve(ActivityService)
      .updateActivity(event?.employee, activityId, event.body);
    return formatJSONResponse(updatedActivity, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateStatusOfActivityHandler = async (event) => {
  try {
    const { activityId, status } = event.params;
    const updatedStatus = await container
      .resolve(ActivityService)
      .updateStatusOfActivity(event?.employee, activityId, status);
    return formatJSONResponse(updatedStatus, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteActivityHandler: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  try {
    const { activityId } = event.params;

    const reminderResp = await container
      .resolve(ActivityService)
      .deleteActivity(event.employee, activityId);
    return formatJSONResponse(reminderResp, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// @TODO export these
export const getActivities = checkRolePermission(
  getActivitiesHandler,
  "ACTIVITY_READ_ALL"
);

export const getActivityById = checkRolePermission(
  getActivityByIdHandler,
  "ACTIVITY_READ"
);

export const createActivity = checkRolePermission(
  createActivityHandler,
  "ACTIVITY_CREATE"
);
export const getMyActivities = checkRolePermission(
  getMyActivitiesHandler,
  "ACTIVITY_READ"
);
export const getTopActivities = checkRolePermission(
  getTopActivitiesHandler,
  "ACTIVITY_READ"
);
export const getAllActivitiesByCompany = checkRolePermission(
  getAllActivitiesByCompanyHandler,
  "ACTIVITY_READ"
);
export const getMyStaleActivityByStatus = checkRolePermission(
  getMyStaleActivityByStatusHandler,
  "ACTIVITY_READ"
);
export const getEmployeeStaleActivityByStatus = checkRolePermission(
  getEmployeeStaleActivityByStatusHandler,
  "ACTIVITY_READ"
);

export const updateActivity = checkRolePermission(
  updateActivityHandler,
  "ACTIVITY_UPDATE"
);

export const updateStatusOfActivity = checkRolePermission(
  updateStatusOfActivityHandler,
  "ACTIVITY_UPDATE"
);

export const deleteActivity = checkRolePermission(
  deleteActivityHandler,
  "ACTIVITY_DELETE"
);

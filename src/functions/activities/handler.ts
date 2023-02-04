import "reflect-metadata";

import { IActivity, IRemarks } from "../../models/interfaces/Activity";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { ActivityService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "tsyringe";

const getActivitiesHandler: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  try {
    const activities = await container
      .resolve(ActivityService)
      .getAllActivities(
        event?.user?.sub,
        // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
        event.queryStringParameters || {}
      );
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getAllActivitiesByCompanyHandler = async (event) => {
  try {
    const { companyId } = event.pathParameters;
    const activities = await container
      .resolve(ActivityService)
      .getAllActivitiesByCompany(
        event?.user?.sub,
        companyId,
        // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
        event.queryStringParameters || {}
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
    const activities = await container.resolve(ActivityService).getMyActivities(
      event?.user?.sub,
      // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
      event.queryStringParameters || {}
    );
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getTopActivitiesHandler = async (event) => {
  const { companyId } = event.pathParameters;
  try {
    const activities = await container
      .resolve(ActivityService)
      .getTopActivities(event?.user?.sub, companyId);
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getMyActivitiesByDayHandler = async (event) => {
  try {
    const activities = await container
      .resolve(ActivityService)
      .getMyActivitiesByDay(event?.user?.sub);
    // event?.user?.sub,
    // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
    // activityId
    // );
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getActivityById: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  const { activityId } = event.pathParameters;
  try {
    const activities = await container.resolve(ActivityService).getActivityById(
      event?.user?.sub,
      // "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
      activityId
    );
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
      // event?.user?.sub,
      "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3", // @TODO replace with auth
      event.body
    );
    return formatJSONResponse(newActivity, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateActivityHandler = async (event) => {
  try {
    const { activityId } = event.pathParameters;

    const updatedActivity = await container
      .resolve(ActivityService)
      .updateActivity(event?.user?.sub, activityId, event.body);
    return formatJSONResponse(updatedActivity, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const deleteActivity: ValidatedEventAPIGatewayProxyEvent<
  IActivity
> = async (event) => {
  try {
    const { activityId } = event.pathParameters;

    await container.resolve(ActivityService).deleteActivity(activityId);
    return formatJSONResponse(
      { message: "Activity deleted successfully" },
      200
    );
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// @TODO bring activity id in url params
export const addRemarksToActivity: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { activityId } = event.pathParameters;
    const newRemarks = await container
      .resolve(ActivityService)
      .addRemarksToActivity(
        "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3", // @TODO replace with auth
        // event?.user?.sub,
        activityId,
        event.body
      );
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateRemarksInActivity: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { activityId, remarksId } = event.pathParameters;
    const newRemarks = await container
      .resolve(ActivityService)
      .updateRemarksInActivity(
        "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3", // @TODO replace with auth
        // event?.user?.sub,
        activityId,
        remarksId,
        event.body
      );
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const deleteRemarkFromActivity: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { activityId, remarksId } = event.pathParameters;

    const deletedRemark = await container
      .resolve(ActivityService)
      .deleteRemarkFromActivity(activityId, remarksId);
    return formatJSONResponse(deletedRemark, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// @TODO export these
export const getActivities = middy(getActivitiesHandler).use(
  decodeJWTMiddleware()
);

export const createActivity = middy(createActivityHandler).use(
  decodeJWTMiddleware()
);

export const getMyActivities = middy(getMyActivitiesHandler).use(
  decodeJWTMiddleware()
);

export const getTopActivities = middy(getTopActivitiesHandler).use(
  decodeJWTMiddleware()
);

export const getAllActivitiesByCompany = middy(
  getAllActivitiesByCompanyHandler
).use(decodeJWTMiddleware());

export const getMyActivitiesByDay = middy(getMyActivitiesByDayHandler).use(
  decodeJWTMiddleware()
);

export const updateActivity = middy(updateActivityHandler).use(
  decodeJWTMiddleware()
);

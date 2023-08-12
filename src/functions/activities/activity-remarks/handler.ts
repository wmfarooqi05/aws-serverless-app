import "reflect-metadata";

import { IRemarks } from "@models/interfaces/Activity";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { ActivityRemarksService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

// @TODO bring activity id in url params
const addRemarksToActivityHandler: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { activityId } = event.params;
    const newRemarks = await container
      .resolve(ActivityRemarksService)
      .addRemarksToActivity(event.employee, activityId, event.body);
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateRemarksInActivityHandler: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { activityId, remarksId } = event.params;
    const newRemarks = await container
      .resolve(ActivityRemarksService)
      .updateRemarksInActivity(
        event.employee,
        activityId,
        remarksId,
        event.body
      );
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteRemarkFromActivityHandler: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { activityId, remarksId } = event.params;

    const deletedRemark = await container
      .resolve(ActivityRemarksService)
      .deleteRemarkFromActivity(event.employee, activityId, remarksId);
    return formatJSONResponse(deletedRemark, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// @TODO export these
export const addRemarksToActivity = checkRolePermission(
  addRemarksToActivityHandler,
  "ACTIVITY_UPDATE"
);
export const deleteRemarkFromActivity = checkRolePermission(
  deleteRemarkFromActivityHandler,
  "ACTIVITY_UPDATE"
);

export const updateRemarksInActivity = checkRolePermission(
  updateRemarksInActivityHandler,
  "ACTIVITY_UPDATE"
);

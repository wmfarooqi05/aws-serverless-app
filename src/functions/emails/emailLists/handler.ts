import "reflect-metadata";

import { IRemarks } from "@models/interfaces/Activity";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { EmailListService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "tsyringe";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

// @TODO bring emailList id in url params
const getAllEmailListsHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const newRemarks = await container
      .resolve(EmailListService)
      .getAllEmailLists(event.employee, event.queryStringParameters || {});
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// @TODO bring emailList id in url params
const addEmailListHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const newRemarks = await container
      .resolve(EmailListService)
      .addEmailList(event.employee, event.body);
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateEmailListHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const { emailListId } = event.pathParameters;
    const newRemarks = await container
      .resolve(EmailListService)
      .updateEmailList(event.employee, emailListId, event.body);
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteEmailListHandler: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const { emailListId } = event.pathParameters;

    const deletedEmailList = await container
      .resolve(EmailListService)
      .deleteEmailList(event.employee, emailListId);
    return formatJSONResponse(deletedEmailList, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getAllEmailLists = checkRolePermission(
  getAllEmailListsHandler,
  "ACTIVITY_UPDATE"
);
// @TODO export these
export const addEmailList = checkRolePermission(
  addEmailListHandler,
  "ACTIVITY_UPDATE"
);
export const updateEmailList = checkRolePermission(
  updateEmailListHandler,
  "ACTIVITY_UPDATE"
);
export const deleteEmailList = checkRolePermission(
  deleteEmailListHandler,
  "ACTIVITY_UPDATE"
);
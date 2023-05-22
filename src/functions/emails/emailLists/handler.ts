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
const createEmailListHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const newRemarks = await container
      .resolve(EmailListService)
      .createEmailList(event.employee, event.body);
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateEmailListHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const { emailListId } = event.params;
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
    const { emailListId } = event.params;

    const deletedEmailList = await container
      .resolve(EmailListService)
      .deleteEmailList(event.employee, emailListId);
    return formatJSONResponse(deletedEmailList, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const addEmailsToEmailListHandler = async (event) => {
  try {
    const { emailListId } = event.params;

    await container
      .resolve(EmailListService)
      .addEmailsToEmailList(event.employee, emailListId, event.body);
    return formatJSONResponse(
      { message: "Emails added to email list successfully" },
      200
    );
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const deleteEmailsFromEmailListHandler = async (event) => {
  try {
    const { emailListId } = event.params;

    const deletedEmails = await container
      .resolve(EmailListService)
      .deleteEmailsFromEmailList(event.employee, emailListId, event.body);
    return formatJSONResponse(
      { message: "Emails added to email list successfully", deletedEmails },
      200
    );
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const syncEmailsHandler = async (event) => {
  try {
    await container.resolve(EmailListService).syncEmails(event.employee);
    return formatJSONResponse(
      {
        message:
          "Emails synced from Contacts table to EmailAddresses table successfully",
      },
      200
    );
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getAllEmailLists = checkRolePermission(
  getAllEmailListsHandler,
  "ACTIVITY_UPDATE"
);
// @TODO export these
export const createEmailList = checkRolePermission(
  createEmailListHandler,
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

export const addEmailsToEmailList = checkRolePermission(
  addEmailsToEmailListHandler,
  "COMPANY_READ"
);

export const deleteEmailsFromEmailList = checkRolePermission(
  deleteEmailsFromEmailListHandler,
  "COMPANY_READ"
);

export const syncEmails = checkRolePermission(
  syncEmailsHandler,
  "COMPANY_READ"
);

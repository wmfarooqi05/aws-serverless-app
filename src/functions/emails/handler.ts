import "reflect-metadata";
import { IEmailModel, IEmailPaginated } from "@models/Emails";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { EmailService } from "./service";
import middy from "@middy/core";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import {
  allowRoleWrapper,
  checkRolePermission,
} from "@middlewares/jwtMiddleware";
import { RolesEnum } from "@models/interfaces/Employees";

export const sendEmailHandler: ValidatedEventAPIGatewayProxyEvent<
  IEmailModel
> = async (event) => {
  try {
    const newEmail = await container
      .resolve(EmailService)
      .sendEmail(event.employee, event.body);
    return formatJSONResponse(newEmail, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getEmailsHandler: ValidatedEventAPIGatewayProxyEvent<
  IEmailPaginated
> = async (event) => {
  try {
    const teams = await container
      .resolve(EmailService)
      .getAllEmails(event.queryStringParameters || {});
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getEmailById: ValidatedEventAPIGatewayProxyEvent<
  IEmailModel
> = async (event) => {
  const { teamId } = event.pathParameters;
  try {
    const teams = await container.resolve(EmailService).getEmail(teamId);
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateEmailHandler: ValidatedEventAPIGatewayProxyEvent<
  IEmailModel
> = async (event) => {
  try {
    const { teamId } = event.pathParameters;
    const updatedEmail = await container
      .resolve(EmailService)
      .updateEmail(event?.employee, teamId, event.body);
    return formatJSONResponse(updatedEmail, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const deleteEmailHandler: ValidatedEventAPIGatewayProxyEvent<IEmailModel> =
  middy(async (event) => {
    try {
      const { teamId } = event.pathParameters;
      await container.resolve(EmailService).deleteEmail(teamId);
      return formatJSONResponse({ message: "Email deleted successfully" }, 200);
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const getEmails = allowRoleWrapper(getEmailsHandler);
export const updateEmail = allowRoleWrapper(updateEmailHandler);
export const sendEmail = checkRolePermission(
  sendEmailHandler,
  "COMPANY_READ_ALL"
);
export const deleteEmail = allowRoleWrapper(
  deleteEmailHandler,
  RolesEnum.ADMIN_GROUP
);

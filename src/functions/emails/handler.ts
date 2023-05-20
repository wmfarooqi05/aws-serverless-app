import "reflect-metadata";
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
import { SESEvent, SQSEvent } from "aws-lambda";

export const sendEmailHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const newEmail = await container
      .resolve(EmailService)
      .sendEmail(event.employee, event.body);
    return formatJSONResponse(newEmail, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getEmailsHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  try {
    const teams = await container
      .resolve(EmailService)
      .getAllEmails(event.query || {});
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getEmailById: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  const { teamId } = event.params;
  try {
    const teams = await container.resolve(EmailService).getEmail(teamId);
    return formatJSONResponse(teams, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateEmailHandler: ValidatedEventAPIGatewayProxyEvent<
  any
> = async (event) => {
  try {
    const { teamId } = event.params;
    const updatedEmail = await container
      .resolve(EmailService)
      .updateEmail(event?.employee, teamId, event.body);
    return formatJSONResponse(updatedEmail, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const deleteEmailHandler: ValidatedEventAPIGatewayProxyEvent<any> =
  middy(async (event) => {
    try {
      const { teamId } = event.params;
      await container.resolve(EmailService).deleteEmail(teamId);
      return formatJSONResponse({ message: "Email deleted successfully" }, 200);
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const handleEmailEvent = async (event: SESEvent) => {
  try {
    console.log("event", event);
    // Extract relevant information from the email event
    const email = event.Records[0].ses.mail;
    const sender = email.source;
    const recipient = email.destination[0];
    const subject = email.commonHeaders.subject;
    const body = email.commonHeaders?.text;

    // Store the extracted information in your database
    const item = { sender, recipient, subject, body };
    const params = {
      TableName: "my-emails-table",
      Item: item,
    };
    console.log("params", params);
    // await dynamoDB.put(params).promise();

    return {
      statusCode: 200,
      body: "Email processed successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Failed to process email",
    };
  }
};

const sendBulkEmailsHandler = async (event) => {
  try {
    const emails = await container
      .resolve(EmailService)
      .sendBulkEmails(event.employee, event.body);
    return formatJSONResponse(emails, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const receiveEmailHandler = async (event: SQSEvent) => {
  try {
    // This is for dev testing
    if (event.body) {
      event.Records = [{ body: event.body }];
    }
    ///////////////////////
    const resp = await container
      .resolve(EmailService)
      .receiveEmailHelper(event.Records);
    return formatJSONResponse(resp, 200);
  } catch (error) {
    return formatErrorResponse({
      message: error.message,
      statusCode: 400,
    });
  }
};

export const getEmailTemplateContentByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  any
> = async (event) => {
  try {
    const newEmailTemplate = await container
      .resolve(EmailService)
      .getEmailTemplateContentById(event.employee, event.params);
    return formatJSONResponse(newEmailTemplate, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getEmailTemplateContentById = checkRolePermission(
  getEmailTemplateContentByIdHandler,
  "COMPANY_READ_ALL"
);

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
export const sendBulkEmails = checkRolePermission(
  sendBulkEmailsHandler,
  "COMPANY_READ_ALL"
);

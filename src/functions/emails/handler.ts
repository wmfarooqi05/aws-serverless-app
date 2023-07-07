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

const getEmailByIdHandler: ValidatedEventAPIGatewayProxyEvent<any> = async (
  event
) => {
  const { emailId } = event.params;
  const { file } = event.query;
  try {
    const email = await container
      .resolve(EmailService)
      .getEmail(event.employee, emailId, file);
    return formatJSONResponse(email, 200);
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
    const jobItem = await container
      .resolve(EmailService)
      .sendBulkEmails(event.employee, event.body);
    return formatJSONResponse(jobItem, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const emailQueueInvokeHandler = async (event: SQSEvent) => {
  try {
    // This is for dev testing
    if (process.env.STAGE === "local") {
      if (event.body) {
        event.Records = [JSON.parse(event.body)];
      }
    }
    ///////////////////////
    const resp = await container
      .resolve(EmailService)
      .emailQueueInvokeHandler(event.Records);
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

export const emailsByContactHandler = async (event) => {
  try {
    const newEmailTemplate = await container
      .resolve(EmailService)
      .emailsByContact(event.employee, event.params);
    return formatJSONResponse(newEmailTemplate, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getMyEmailsHandler = async (event) => {
  try {
    console.log("env", process.env);
    const emails = await container
      .resolve(EmailService)
      .getMyEmails(event.employee, event.query);
    return formatJSONResponse(emails, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteEmailByIdHandler = async (event) => {
  try {
    await container
      .resolve(EmailService)
      .deleteEmailById(event.employee, event.params);
    return formatJSONResponse(emails, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const moveToFolderHandler = async (event) => {
  try {
    const count = await container
      .resolve(EmailService)
      .moveToFolder(event.employee, event.body);
    return formatJSONResponse({ message: `Updated ${count} records` }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const bulkEmailSqsEventHandler = async (event) => {
  try {
    const count = await container
      .resolve(EmailService)
      .bulkEmailSqsEventHandler(event.employee, event.body);
    return formatJSONResponse({ message: `Updated ${count} records` }, 200);
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
  RolesEnum.ADMIN
);
export const sendBulkEmails = checkRolePermission(
  sendBulkEmailsHandler,
  "COMPANY_READ_ALL"
);

export const emailsByContact = checkRolePermission(
  emailsByContactHandler,
  "COMPANY_READ_ALL"
);

export const getMyEmails = checkRolePermission(
  getMyEmailsHandler,
  "COMPANY_READ_ALL"
);

export const getEmailById = checkRolePermission(
  getEmailByIdHandler,
  "COMPANY_READ_ALL"
);

export const deleteEmailById = checkRolePermission(
  deleteEmailByIdHandler,
  "COMPANY_READ_ALL"
);

export const moveToFolder = checkRolePermission(
  moveToFolderHandler,
  "COMPANY_READ_ALL"
);

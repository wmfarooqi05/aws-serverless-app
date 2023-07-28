import "reflect-metadata";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { EmailTemplateService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

const createEmailTemplateHandler: ValidatedEventAPIGatewayProxyEvent<
  any
> = async (event) => {
  try {
    const newEmailTemplate = await container
      .resolve(EmailTemplateService)
      .createEmailTemplate(event.employee, event.body);
    return formatJSONResponse(newEmailTemplate, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteEmailTemplateHandler = async (event) => {
  try {
    const newEmailTemplate = await container
      .resolve(EmailTemplateService)
      .deleteEmailTemplate(event.employee, event.body);
    return formatJSONResponse(newEmailTemplate, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getAllTemplatesHandler = async (event) => {
  try {
    const newEmailTemplate = await container
      .resolve(EmailTemplateService)
      .getAllTemplates(event.query || {});
    return formatJSONResponse(newEmailTemplate, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getTemplateByIdHandler = async (event) => {
  try {
    const newEmailTemplate = await container
      .resolve(EmailTemplateService)
      .getTemplateById(event.params);
    return formatJSONResponse(newEmailTemplate, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};
export const getAllTemplates = checkRolePermission(
  getAllTemplatesHandler,
  "COMPANY_READ_ALL"
);

export const createEmailTemplate = checkRolePermission(
  createEmailTemplateHandler,
  "COMPANY_READ_ALL"
);
export const getTemplateById = checkRolePermission(
  getTemplateByIdHandler,
  "COMPANY_READ_ALL"
);

export const deleteEmailTemplate = checkRolePermission(
  deleteEmailTemplateHandler,
  "COMPANY_READ_ALL"
);

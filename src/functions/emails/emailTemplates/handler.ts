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
import {
  checkRolePermission,
} from "@middlewares/jwtMiddleware";

export const createEmailTemplateHandler: ValidatedEventAPIGatewayProxyEvent<
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

export const createEmailTemplate = checkRolePermission(
  createEmailTemplateHandler,
  "COMPANY_READ_ALL"
);

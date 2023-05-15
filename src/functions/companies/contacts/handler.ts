import "reflect-metadata";
import { IContactModel } from "@models/Contacts";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { ContactService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

const createContactsHandler: ValidatedEventAPIGatewayProxyEvent<
  IContactModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const contact = await container
      .resolve(ContactService)
      .createContacts(event?.employee, companyId, event.body);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateContactHandler: ValidatedEventAPIGatewayProxyEvent<
  IContactModel
> = async (event) => {
  try {
    const { companyId, contactId } = event.params;
    const contact = await container
      .resolve(ContactService)
      .updateContact(companyId, contactId, event?.employee, event.body);

    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteContactHandler: ValidatedEventAPIGatewayProxyEvent<
  IContactModel
> = async (event) => {
  try {
    const { contactId, companyId } = event.params;
    // Add guard validation if required
    const contact = await container
      .resolve(ContactService)
      .deleteContact(event.employee, companyId, contactId);

    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const addEmailHandler = async (event) => {
  try {
    const { contactId } = event.params;
    const contact = await container
      .resolve(ContactService)
      .addContactEmail(event?.employee, contactId, event.body);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteEmailHandler = async (event) => {
  try {
    const { emailId } = event.params;
    const contact = await container
      .resolve(ContactService)
      .deleteContactEmail(event?.employee, emailId);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};
export const createContacts = checkRolePermission(
  createContactsHandler,
  "CONTACT_CREATE"
);

export const updateContact = checkRolePermission(
  updateContactHandler,
  "CONTACT_UPDATE"
);
export const deleteContact = checkRolePermission(
  deleteContactHandler,
  "CONTACT_DELETE"
);

export const addEmail = checkRolePermission(addEmailHandler, "COMPANY_READ");

export const deleteEmail = checkRolePermission(
  deleteEmailHandler,
  "COMPANY_READ"
);

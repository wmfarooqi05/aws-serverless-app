import "reflect-metadata";
import { IInvoiceModel } from "@models/Invoices";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { InvoiceService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

const getAllInvoicesHandler = async (event) => {
  try {
    const contact = await container
      .resolve(InvoiceService)
      .getAllInvoices(event?.employee, event.query || {});
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getInvoicesByCompanyHandler = async (event) => {
  try {
    const { companyId } = event.params;
    const contact = await container
      .resolve(InvoiceService)
      .getInvoicesByCompany(event?.employee, companyId, event.query || {});
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getInvoiceByIdHandler = async (event) => {
  try {
    const { contactId } = event.params;
    const contact = await container
      .resolve(InvoiceService)
      .getInvoiceById(event?.employee, contactId);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createInvoicesHandler: ValidatedEventAPIGatewayProxyEvent<
  IInvoiceModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const contact = await container
      .resolve(InvoiceService)
      .createInvoices(event?.employee, companyId, event.body);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateInvoiceHandler: ValidatedEventAPIGatewayProxyEvent<
  IInvoiceModel
> = async (event) => {
  try {
    const { companyId, contactId } = event.params;
    const contact = await container
      .resolve(InvoiceService)
      .updateInvoice(companyId, contactId, event?.employee, event.body);

    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteInvoiceHandler: ValidatedEventAPIGatewayProxyEvent<
  IInvoiceModel
> = async (event) => {
  try {
    const { contactId, companyId } = event.params;
    // Add guard validation if required
    const contact = await container
      .resolve(InvoiceService)
      .deleteInvoice(event.employee, contactId);

    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const addEmailHandler = async (event) => {
  try {
    const { contactId } = event.params;
    const contact = await container
      .resolve(InvoiceService)
      .addInvoiceEmail(event?.employee, contactId, event.body);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteEmailHandler = async (event) => {
  try {
    const { emailId } = event.params;
    const contact = await container
      .resolve(InvoiceService)
      .deleteInvoiceEmail(event?.employee, emailId);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};
export const createInvoices = checkRolePermission(
  createInvoicesHandler,
  "CONTACT_CREATE"
);

export const updateInvoice = checkRolePermission(
  updateInvoiceHandler,
  "CONTACT_UPDATE"
);
export const deleteInvoice = checkRolePermission(
  deleteInvoiceHandler,
  "CONTACT_DELETE"
);

export const addEmail = checkRolePermission(addEmailHandler, "COMPANY_READ");

export const deleteEmail = checkRolePermission(
  deleteEmailHandler,
  "COMPANY_READ"
);

export const getAllInvoices = checkRolePermission(
  getAllInvoicesHandler,
  "COMPANY_READ"
);

export const getInvoicesByCompany = checkRolePermission(
  getInvoicesByCompanyHandler,
  "COMPANY_READ"
);

export const getInvoiceById = checkRolePermission(
  getInvoiceByIdHandler,
  "COMPANY_READ"
);

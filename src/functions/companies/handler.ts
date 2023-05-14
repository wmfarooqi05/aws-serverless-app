import "reflect-metadata";
import { ICompanyModel, ICompanyPaginated } from "@models/Company";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { CompanyService } from "./service";
import middy from "@middy/core";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { checkRolePermission } from "@middlewares/jwtMiddleware";
import { COMPANIES_TABLE_NAME } from "@models/commons";

export const createCompanyHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const newCompany = await container
      .resolve(CompanyService)
      .createCompany(event.employee, event.body);
    return formatJSONResponse(newCompany, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getCompaniesHandler = async (event) => {
  try {
    const service = container.resolve(CompanyService);
    const companies = await service.getAllCompanies(
      event.employee,
      event.query || {}
    );
    return formatJSONResponse(companies, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// const getMyCompaniesHandler = async (event) => {
//   try {
//     const companies = await container
//       .resolve(CompanyService)
//       .getMyCompanies(event.employee, event.query || {});
//     return formatJSONResponse(companies, 200);
//   } catch (e) {
//     return formatErrorResponse(e);
//   }
// };

const getCompaniesByEmployeeIdHandler = async (event) => {
  try {
    const { employeeId } = event.params;
    const companies = await container
      .resolve(CompanyService)
      .getCompaniesByEmployeeId(
        event.employee,
        employeeId,
        event.query || {}
      );
    return formatJSONResponse(companies, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getCompanyByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  const { companyId } = event.params;
  try {
    const companies = await container
      .resolve(CompanyService)
      .getCompany(event.employee, companyId);
    return formatJSONResponse(companies, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const updateCompanyHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const updatedCompany = await container
      .resolve(CompanyService)
      .updateCompany(event?.employee, companyId, event.body);
    return formatJSONResponse(updatedCompany, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const updateCompanyInteractionsHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const updatedCompany = await container
      .resolve(CompanyService)
      .updateCompanyEmployeeInteractions(
        event?.employee,
        companyId,
        event.body
      );
    return formatJSONResponse(updatedCompany, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

const convertCompanyHandler = async (event) => {
  try {
    const { companyId } = event.params;
    const response = await container
      .resolve(CompanyService)
      .convertCompany(event?.employee, companyId);
    return formatJSONResponse(response, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const deleteCompanyHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const response = await container
      .resolve(CompanyService)
      .deleteCompany(event?.employee, companyId);
    return formatJSONResponse(response, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateCompanyAssignedEmployeeHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    // @TODO put auth guard
    // Employee must be there
    // Role guard of manager or above
    const { companyId } = event.params;
    const company = await container
      .resolve(CompanyService)
      .updateCompanyAssignedEmployee(event?.employee, companyId, event.body);

    return formatJSONResponse(company, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateCompaniesAssignedEmployeeHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const company = await container
      .resolve(CompanyService)
      .updateCompaniesAssignedEmployee(event?.employee, event.body);

    return formatJSONResponse(company, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createContactsHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const contact = await container
      .resolve(CompanyService)
      .createContacts(event?.employee, companyId, event.body);
    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateContactHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId, contactId } = event.params;
    const contact = await container
      .resolve(CompanyService)
      .updateContact(
        companyId,
        contactId,
        event?.employee,
        event.body
      );

    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteContactHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { contactId, companyId } = event.params;
    // Add guard validation if required
    const contact = await container
      .resolve(CompanyService)
      .deleteContact(event.employee, companyId, contactId);

    return formatJSONResponse(contact, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getNotesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.params;
    const notes = await container
      .resolve(CompanyService)
      .getNotes(event?.employee, companyId);
    return formatJSONResponse({ notes }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createNotesHandler = async (event) => {
  try {
    const { companyId } = event.params;
    const notes = await container
      .resolve(CompanyService)
      .createNotes(event?.employee, companyId, event.body);
    return formatJSONResponse(notes, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateNotesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId, notesId } = event.params;
    const notes = await container
      .resolve(CompanyService)
      .updateNotes(event?.employee, companyId, notesId, event.body);

    return formatJSONResponse(notes, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteNotesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { notesId, companyId } = event.params;
    // Add guard validation if required
    const notes = await container
      .resolve(CompanyService)
      .deleteNotes(event.employee, companyId, notesId);

    return formatJSONResponse(notes, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getCompanies = checkRolePermission(
  getCompaniesHandler,
  "COMPANY_READ_ALL"
);

export const getCompanyById = checkRolePermission(
  getCompanyByIdHandler,
  "COMPANY_READ"
);

export const getCompaniesByEmployeeId = checkRolePermission(
  getCompaniesByEmployeeIdHandler,
  "COMPANY_READ"
);
export const updateCompany = checkRolePermission(
  updateCompanyHandler,
  "COMPANY_UPDATE",
  "companyId",
  "assignedTo"
);

export const updateCompanyInteractions = checkRolePermission(
  updateCompanyInteractionsHandler,
  "COMPANY_READ"
);

export const convertCompany = checkRolePermission(
  convertCompanyHandler,
  "COMPANY_CONVERT"
);

export const createCompany = checkRolePermission(
  createCompanyHandler,
  "COMPANY_CREATE"
);
export const deleteCompany = checkRolePermission(
  deleteCompanyHandler,
  "COMPANY_DELETE"
);

export const updateCompanyAssignedEmployee = checkRolePermission(
  updateCompanyAssignedEmployeeHandler,
  "COMPANY_UPDATE"
);

export const updateCompaniesAssignedEmployee = checkRolePermission(
  updateCompaniesAssignedEmployeeHandler,
  "COMPANY_UPDATE"
);

export const createContacts = checkRolePermission(
  createContactsHandler,
  "CONTACT_CREATE",
  "companyId",
  "assignedTo"
);

export const updateContact = checkRolePermission(
  updateContactHandler,
  "CONTACT_UPDATE",
  "companyId",
  "assignedTo"
);
export const deleteContact = checkRolePermission(
  deleteContactHandler,
  "CONTACT_DELETE",
  "companyId",
  "assignedTo"
);

export const createNotes = checkRolePermission(
  createNotesHandler,
  "COMPANY_READ_ALL"
);

export const updateNotes = checkRolePermission(
  updateNotesHandler,
  "COMPANY_READ_ALL"
);

export const deleteNotes = checkRolePermission(
  deleteNotesHandler,
  "COMPANY_READ_ALL"
);

export const getNotes = checkRolePermission(getNotesHandler, "COMPANY_READ");

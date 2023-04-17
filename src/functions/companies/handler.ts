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

const getCompaniesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyPaginated
> = async (event) => {
  try {
    const companies = await container
      .resolve(CompanyService)
      .getAllCompanies(event.employee, event.queryStringParameters || {});
    return formatJSONResponse(companies, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

// const getMyCompaniesHandler = async (event) => {
//   try {
//     const companies = await container
//       .resolve(CompanyService)
//       .getMyCompanies(event.employee, event.queryStringParameters || {});
//     return formatJSONResponse(companies, 200);
//   } catch (e) {
//     return formatErrorResponse(e);
//   }
// };

const getCompaniesByEmployeeIdHandler = async (event) => {
  try {
    const { employeeId } = event.pathParameters;
    const companies = await container
      .resolve(CompanyService)
      .getCompaniesByEmployeeId(
        event.employee,
        employeeId,
        event.queryStringParameters || {}
      );
    return formatJSONResponse(companies, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getCompanyByIdHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  const { companyId } = event.pathParameters;
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
    const { companyId } = event.pathParameters;
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
    const { companyId } = event.pathParameters;
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

export const deleteCompanyHandler: ValidatedEventAPIGatewayProxyEvent<ICompanyModel> =
  middy(async (event) => {
    try {
      const { companyId } = event.pathParameters;
      const response = await container
        .resolve(CompanyService)
        .deleteCompany(event?.employee, companyId);
      return formatJSONResponse(response, 200);
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

const updateCompanyAssignedEmployeeHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    // @TODO put auth guard
    // Employee must be there
    // Role guard of manager or above
    const { companyId } = event.pathParameters;
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

const createConcernedPersonsHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.pathParameters;
    const concernedPerson = await container
      .resolve(CompanyService)
      .createConcernedPersons(event?.employee, companyId, event.body);
    return formatJSONResponse(concernedPerson, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateConcernedPersonHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId, concernedPersonId } = event.pathParameters;
    const concernedPerson = await container
      .resolve(CompanyService)
      .updateConcernedPerson(
        companyId,
        concernedPersonId,
        event?.employee,
        event.body
      );

    return formatJSONResponse(concernedPerson, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const deleteConcernedPersonHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { concernedPersonId, companyId } = event.pathParameters;
    // Add guard validation if required
    const concernedPerson = await container
      .resolve(CompanyService)
      .deleteConcernedPerson(event.employee, companyId, concernedPersonId);

    return formatJSONResponse(concernedPerson, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getNotesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.pathParameters;
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
    const { companyId } = event.pathParameters;
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
    const { companyId, notesId } = event.pathParameters;
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
    const { notesId, companyId } = event.pathParameters;
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

export const createConcernedPersons = checkRolePermission(
  createConcernedPersonsHandler,
  "CONCERNED_PERSON_CREATE",
  "companyId",
  "assignedTo"
);

export const updateConcernedPerson = checkRolePermission(
  updateConcernedPersonHandler,
  "CONCERNED_PERSON_UPDATE",
  "companyId",
  "assignedTo"
);
export const deleteConcernedPerson = checkRolePermission(
  deleteConcernedPersonHandler,
  "CONCERNED_PERSON_DELETE",
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

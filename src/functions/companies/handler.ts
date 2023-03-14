import "reflect-metadata";
import { ICompanyModel, ICompanyPaginated } from "@models/Company";
import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { CompanyService } from "./service";
import middy from "@middy/core";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import jwtMiddlewareWrapper from "@libs/middlewares/jwtMiddleware";

export const createCompanyHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const newCompany = await container
      .resolve(CompanyService)
      .createCompany(event.user?.sub || "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3", event.body);
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
      .getAllCompanies(event.queryStringParameters || {});
    return formatJSONResponse(companies, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getCompanyById: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  const { companyId } = event.pathParameters;
  try {
    const companies = await container
      .resolve(CompanyService)
      .getCompany(companyId);
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
      .updateCompany(event?.user, companyId, event.body);
    return formatJSONResponse(updatedCompany, 200);
  } catch (e) {
    console.log("e", e);
    return formatErrorResponse(e);
  }
};

export const deleteCompany: ValidatedEventAPIGatewayProxyEvent<ICompanyModel> =
  middy(async (event) => {
    try {
      const { companyId } = event.pathParameters;
      await container
        .resolve(CompanyService)
        .deleteCompany(event?.user, companyId);
      return formatJSONResponse(
        { message: "Company deleted successfully" },
        200
      );
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

const updateCompanyAssignedUserHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    // @TODO put auth guard
    // User must be there
    // Role guard of manager or above
    const { companyId } = event.pathParameters;
    const company = await container
      .resolve(CompanyService)
      .updateCompanyAssignedUser(companyId, event?.user?.sub, event.body);

    return formatJSONResponse({ company }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createConcernedPersonsHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.pathParameters;
    const company = await container
      .resolve(CompanyService)
      .createConcernedPersons(event?.user, companyId, event.body);
    return formatJSONResponse({ company }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateConcernedPersonHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId, concernedPersonId } = event.pathParameters;
    const company = await container
      .resolve(CompanyService)
      .updateConcernedPerson(
        companyId,
        concernedPersonId,
        event?.user?.sub,
        event.body
      );

    return formatJSONResponse({ company }, 200);
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
    const company = await container
      .resolve(CompanyService)
      .deleteConcernedPerson(companyId, concernedPersonId);

    return formatJSONResponse({ company }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const getNotesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId } = event.pathParameters;
    const company = await container
      .resolve(CompanyService)
      .getNotes(event?.user?.sub, companyId);
    return formatJSONResponse({ company }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const createNotesHandler = async (event) => {
  try {
    const { companyId } = event.pathParameters;
    const company = await container
      .resolve(CompanyService)
      .createNotes(event?.user?.sub, companyId, event.body);
    return formatJSONResponse({ company }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const updateNotesHandler: ValidatedEventAPIGatewayProxyEvent<
  ICompanyModel
> = async (event) => {
  try {
    const { companyId, notesId } = event.pathParameters;
    const company = await container
      .resolve(CompanyService)
      .updateNotes(event?.user?.sub, companyId, notesId, event.body);

    return formatJSONResponse({ company }, 200);
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
    const company = await container
      .resolve(CompanyService)
      .deleteNotes(companyId, notesId);

    return formatJSONResponse({ company }, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getCompanies = jwtMiddlewareWrapper(getCompaniesHandler);
// .use(permissionMiddleware2(["update"], "COMPANY"));
export const updateCompany = jwtMiddlewareWrapper(updateCompanyHandler);
export const createCompany = jwtMiddlewareWrapper(createCompanyHandler);

// export const deleteCompany = middy(deleteCompanyHandler).use(
//   decodeJWTMiddleware()
// );

export const updateCompanyAssignedUser = jwtMiddlewareWrapper(
  updateCompanyAssignedUserHandler
);

export const createConcernedPersons = jwtMiddlewareWrapper(
  createConcernedPersonsHandler
);

export const updateConcernedPerson = jwtMiddlewareWrapper(
  updateConcernedPersonHandler
);
export const deleteConcernedPerson = jwtMiddlewareWrapper(
  deleteConcernedPersonHandler
);

export const createNotes = jwtMiddlewareWrapper(createNotesHandler);
export const updateNotes = jwtMiddlewareWrapper(updateNotesHandler);
export const deleteNotes = jwtMiddlewareWrapper(deleteNotesHandler);
export const getNotes = jwtMiddlewareWrapper(getNotesHandler);

//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const createCompany = {
  handler: `${handlerPath(__dirname)}/handler.createCompany`,
  events: [
    {
      http: {
        method: "post",
        path: "company",
        cors: true,
      },
    },
  ],
};

const getCompanies = {
  handler: `${handlerPath(__dirname)}/handler.getCompanies`,
  events: [
    {
      http: {
        method: "get",
        path: "companies",
        cors: true,
        // authorizer: {
        //   type: "COGNITO_EMPLOYEE_POOLS",
        //   authorizerId: {
        //     Ref: "ApiGatewayAuthorizer"
        //   }
        // },
      },
    },
  ],
};

const getCompanyById = {
  handler: `${handlerPath(__dirname)}/handler.getCompanyById`,
  events: [
    {
      http: {
        method: "get",
        path: "company/{companyId}",
        cors: true,
      },
    },
  ],
};

const updateCompany = {
  handler: `${handlerPath(__dirname)}/handler.updateCompany`,
  events: [
    {
      http: {
        method: "put",
        path: "company/{companyId}",
        cors: true,
      },
    },
  ],
};

const deleteCompany = {
  handler: `${handlerPath(__dirname)}/handler.deleteCompany`,
  events: [
    {
      http: {
        method: "delete",
        path: "company/{companyId}",
        cors: true,
      },
    },
  ],
};

const updateCompanyAssignedEmployee = {
  handler: `${handlerPath(__dirname)}/handler.updateCompanyAssignedEmployee`,
  events: [
    {
      http: {
        method: "put",
        path: "company/{companyId}/assign",
        cors: true,
      },
    },
  ],
};

const createConcernedPersons = {
  handler: `${handlerPath(__dirname)}/handler.createConcernedPersons`,
  events: [
    {
      http: {
        method: "post",
        path: "/company/{companyId}/concerned-person",
        cors: true,
      },
    },
  ],
};

const updateConcernedPerson = {
  handler: `${handlerPath(__dirname)}/handler.updateConcernedPerson`,
  events: [
    {
      http: {
        method: "put",
        path: "/company/{companyId}/concerned-person/{concernedPersonId}",
        cors: true,
      },
    },
  ],
};

const deleteConcernedPerson = {
  handler: `${handlerPath(__dirname)}/handler.deleteConcernedPerson`,
  events: [
    {
      http: {
        method: "delete",
        path: "/company/{companyId}/concerned-person/{concernedPersonId}",
        cors: true,
      },
    },
  ],
};

// Notes

const getNotes = {
  handler: `${handlerPath(__dirname)}/handler.getNotes`,
  events: [
    {
      http: {
        method: "get",
        path: "/company/{companyId}/notes",
        cors: true,
      },
    },
  ],
};

const createNotes = {
  handler: `${handlerPath(__dirname)}/handler.createNotes`,
  events: [
    {
      http: {
        method: "post",
        path: "/company/{companyId}/notes",
        cors: true,
      },
    },
  ],
};

const updateNotes = {
  handler: `${handlerPath(__dirname)}/handler.updateNotes`,
  events: [
    {
      http: {
        method: "put",
        path: "/company/{companyId}/notes/{notesId}",
        cors: true,
      },
    },
  ],
};

const deleteNotes = {
  handler: `${handlerPath(__dirname)}/handler.deleteNotes`,
  events: [
    {
      http: {
        method: "delete",
        path: "/company/{companyId}/notes/{notesId}",
        cors: true,
      },
    },
  ],
};

export {
  getCompanies,
  createCompany,
  getCompanyById,
  updateCompany,
  deleteCompany,
  updateCompanyAssignedEmployee,
  createConcernedPersons,
  updateConcernedPerson,
  deleteConcernedPerson,
  getNotes,
  createNotes,
  updateNotes,
  deleteNotes,
};

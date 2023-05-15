//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";

const companyHandler = {
  handler: `${handlerPath(__dirname)}/express.handler`,
  events: [
    {
      http: {
        method: "post",
        path: "company",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "companies",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "company/{companyId}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "company/{companyId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "company/{companyId}",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "company/{companyId}/assign",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "company/assign",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "companies/employee/{employeeId}",
        cors: true,
      },
    },

    ///////// CONTACT

    {
      http: {
        method: "post",
        path: "/company/{companyId}/contact",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "/company/{companyId}/contact/{contactId}",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "/company/{companyId}/contact/{contactId}/email",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "/company/{companyId}/contact/{contactId}/email/{emailId}",
        cors: true,
      },
    },

    ////////
    {
      http: {
        method: "put",
        path: "/company/{companyId}/employee-interactions",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "/company/{companyId}/convert",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "/company/{companyId}/contact/{contactId}",
        cors: true,
      },
    },
    {
      http: {
        method: "get",
        path: "/company/{companyId}/notes",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "/company/{companyId}/notes",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "/company/{companyId}/notes/{notesId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "/company/{companyId}/notes/{notesId}",
        cors: true,
      },
    }, // Email Lists
    {
      http: {
        method: "get",
        path: "email-list",
        cors: true,
      },
    },
    {
      http: {
        method: "post",
        path: "email-list",
        cors: true,
      },
    },
    {
      http: {
        method: "put",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
    {
      http: {
        method: "delete",
        path: "email-list/{emailListId}",
        cors: true,
      },
    },
  ],
};

export { companyHandler };

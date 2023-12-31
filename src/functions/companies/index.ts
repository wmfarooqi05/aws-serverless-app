//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";
import contactEvents from "./contacts";

const companiesHandler = {
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
        method: "get",
        path: "companies/email-list-contacts",
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
        method: "put",
        path: "company/{companyId}/avatar",
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
    },
  ],
};

// companiesHandler.events.push(...invoiceEvents);
companiesHandler.events.push(...(contactEvents as any));

export { companiesHandler };

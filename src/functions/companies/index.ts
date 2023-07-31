//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";
import { AWS } from "@serverless/typescript";
import contactEvents from "./contacts";

const companyHandler: AWS["functions"][0] = {
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

// companyHandler.events.push(...invoiceEvents);
companyHandler.events.push(...contactEvents);

export { companyHandler };

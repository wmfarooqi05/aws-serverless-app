//@ts-ignore
import { handlerPath } from "@libs/handler-resolver";
import { AWS } from "@serverless/typescript";

const invoiceEvents: AWS["functions"][0]["events"] = [
  {
    http: {
      method: "get",
      path: "invoices", //Admin Endpoint
      cors: true,
    },
  },
  {
    http: {
      method: "get",
      path: "invoices/company/{companyId}/all", // Maybe ADMIN Endpoint
      cors: true,
    },
  },
  {
    http: {
      method: "get",
      path: "invoices/company/{companyId}/my-invoices", // by employee
      cors: true,
    },
  },
  {
    http: {
      method: "get",
      path: "invoice/{invoiceId}",
      cors: true,
    },
  },
  {
    http: {
      method: "get",
      path: "invoice/{invoiceId}",
      cors: true,
    },
  },
  {
    http: {
      method: "post",
      path: "invoice",
      cors: true,
    },
  },
  {
    http: {
      method: "put",
      path: "invoice/{invoiceId}",
      cors: true,
    },
  },
  {
    http: {
      method: "delete",
      path: "invoice/{invoiceId}",
      cors: true,
    },
  },
];

export default invoiceEvents;

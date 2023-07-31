import { AWS } from "@serverless/typescript";

const contactEvents: AWS["functions"][0]["events"] = [
  {
    http: {
      method: "get",
      path: "contact",
      cors: true,
    },
  },
  {
    http: {
      method: "get",
      path: "company/{companyId}/contact",
      cors: true,
    },
  },
  {
    http: {
      method: "get",
      path: "contact/{contactId}",
      cors: true,
    },
  },
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
  {
    http: {
      method: "delete",
      path: "/company/{companyId}/contact/{contactId}",
      cors: true,
    },
  },
];

export default contactEvents;

//@ts-ignore
import { createLeadSchema, getLeadsSchema } from "./schema";
import { handlerPath } from "@libs/handler-resolver";

const createLead = {
  handler: `${handlerPath(__dirname)}/handler.createLead`,
  events: [
    {
      http: {
        method: "post",
        path: "lead",
        cors: true,
      },
    },
  ],
};

const getLeads = {
  handler: `${handlerPath(__dirname)}/handler.getLeads`,
  events: [
    {
      http: {
        method: "get",
        path: "leads",
        cors: true,
        // authorizer: {
        //   type: "COGNITO_USER_POOLS",
        //   authorizerId: {
        //     Ref: "ApiGatewayAuthorizer"
        //   }
        // },
      },
    },
  ],
};

const getLeadById = {
  handler: `${handlerPath(__dirname)}/handler.getLeadById`,
  events: [
    {
      http: {
        method: "get",
        path: "lead/{leadId}",
        cors: true,
      },
    },
  ],
};

const updateLead = {
  handler: `${handlerPath(__dirname)}/handler.updateLead`,
  events: [
    {
      http: {
        method: "put",
        path: "lead",
        cors: true,
      },
    },
  ],
};

const deleteLead = {
  handler: `${handlerPath(__dirname)}/handler.deleteLead`,
  events: [
    {
      http: {
        method: "delete",
        path: "lead/{leadId}",
        cors: true,
      },
    },
  ],
};

const updateLeadAssignedUser = {
  handler: `${handlerPath(__dirname)}/handler.updateLeadAssignedUser`,
  events: [
    {
      http: {
        method: "put",
        path: "lead/assign",
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
        path: "concerned-person",
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
        path: "concerned-person/{id}",
        cors: true,
        
      },
    },
  ],
};

export {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
  updateLeadAssignedUser,
  createConcernedPersons,
  updateConcernedPerson,
};

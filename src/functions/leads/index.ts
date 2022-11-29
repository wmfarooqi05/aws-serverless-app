//@ts-ignore
import { createLeadSchema, getLeadsSchema } from './schema';
import { handlerPath } from '@libs/handler-resolver';

const createLead = {
  handler: `${handlerPath(__dirname)}/handler.createLead`,
  events: [
    {
      http: {
        method: 'post',
        path: 'lead',
        cors: true,
        request: {
          schemas: {
            'application/json': createLeadSchema,
          },
        },
      },
    },
  ],
};

const getLeads = {
  handler: `${handlerPath(__dirname)}/handler.getLeads`,
  events: [
    {
      http: {
        method: 'get',
        path: 'leads',
        cors: true,
        authorizer: {
          type: "COGNITO_USER_POOLS",
          authorizerId: {
            Ref: "ApiGatewayAuthorizer"
          }
        },
      },
    },
  ],
};

const getLeadById = {
  handler: `${handlerPath(__dirname)}/handler.getLeadById`,
  events: [
    {
      http: {
        method: 'get',
        path: 'lead/{leadId}',
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
        method: 'put',
        path: 'lead',
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
        method: 'delete',
        path: 'lead/{leadId}',
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
        method: 'put',
        path: 'lead/assign',
        cors: true,
      },
    },
  ],
};


export { getLeads, createLead, getLeadById, updateLead, deleteLead, updateLeadAssignedUser };

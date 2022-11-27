import schema from './schema';
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
            'application/json': schema,
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
        }
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

const processLeads = {
  handler: `${handlerPath(__dirname)}/handler.processLeads`,
  // events: [
  //   {
  //     schedule: "rate(10 minutes)",
  //   }
  // ],
}

export { getLeads, createLead, getLeadById, updateLead, deleteLead, processLeads };

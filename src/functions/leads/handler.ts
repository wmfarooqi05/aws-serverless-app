import "reflect-metadata";
import * as createHttpError from "http-errors";

import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { LeadService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { DatabaseService } from "@libs/database-service";
import { container } from "tsyringe";
import { Lead } from "./model";
import { APIGatewayProxyResult } from "aws-lambda";

export const createLead: ValidatedEventAPIGatewayProxyEvent<
  Lead
> = async (event) => {
  console.log('a');
  try {
    const newLead = await container.resolve(LeadService).createLead(event.body);
    return {
      body: JSON.stringify(newLead),
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      },
    } as APIGatewayProxyResult;
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const getLeads: ValidatedEventAPIGatewayProxyEvent<
  Lead[]
> = async () => {
  try {
    console.log('entered getLeads');
    const leadService = await container.resolve(LeadService);
    console.log('got leads service', leadService);
    const leads = await leadService.getAllLeads({});
    console.log('got leads result', leads);
    return {
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      },
      body: JSON.stringify(leads),
      statusCode: 200,
    };
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const getLeadById: ValidatedEventAPIGatewayProxyEvent<
  Lead[]
> = async (event) => {
  const { leadId } = event.pathParameters;
  try {
    const leads = await container
      .resolve(LeadService)
      .getLead(leadId);
    return {
      body: JSON.stringify(leads),
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      }
    } as APIGatewayProxyResult;
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const updateLead: ValidatedEventAPIGatewayProxyEvent<
  Lead[]
> = async (event) => {
  const lead = JSON.parse(event.body);
  console.log("lead", lead);
  try {
    const leads = await container
      .resolve(LeadService)
      .updateLead(lead.id, lead.status);
    return formatJSONResponse({ leads }, 200);
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const deleteLead: ValidatedEventAPIGatewayProxyEvent<
  Lead[]
> = async (event) => {
  const { leadId } = event.pathParameters;
  const leads = await container
    .resolve(LeadService)
    .deleteLead(leadId);
  return formatJSONResponse({ leads }, 200);
};

export const processLeads: ValidatedEventAPIGatewayProxyEvent<
  any
> = async () => {
  console.log('processLeads', "logs");
  // await container.resolve(LeadService).processLeads();
  return formatJSONResponse({}, 200);
};

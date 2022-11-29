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
import { container } from "tsyringe";
import { Lead } from "./model";
import { APIGatewayProxyResult } from "aws-lambda";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

export const createLead: ValidatedEventAPIGatewayProxyEvent<
  Lead
> = async (event) => {
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

const getLeadsHandler = async (event) => {
  try {
    const leads = await container.resolve(LeadService).getAllLeads(event.queryStringParameters);
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
    throw new createHttpError.InternalServerError(e.message);
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
  try {
    const updatedLead = await container
      .resolve(LeadService)
      .updateLead(event.body);
    return formatJSONResponse({ updatedLead }, 200);
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

const updateLeadAssignedUserHandler: ValidatedEventAPIGatewayProxyEvent<
  any
> = async (event) => {
  // @TODO put auth guard
  // User must be there
  // Role guard of manager or above
  const lead = await container.resolve(LeadService).updateLeadAssignedUser(event?.user?.sub, event.body);

  return formatJSONResponse({ lead }, 200);
}

export const processLeads: ValidatedEventAPIGatewayProxyEvent<
  any
> = async () => {
  console.log('processLeads', "logs");
  // await container.resolve(LeadService).processLeads();
  return formatJSONResponse({}, 200);
};

export const getLeads = middy(getLeadsHandler).use(decodeJWTMiddleware());
export const updateLeadAssignedUser = middy(updateLeadAssignedUserHandler).use(decodeJWTMiddleware());

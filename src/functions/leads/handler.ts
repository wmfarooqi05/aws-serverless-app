import "reflect-metadata";
import * as createHttpError from "http-errors";

import { ILeadModel, ILeadPaginated } from "../../models/Lead";

import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { LeadService } from "./service";
import { APIGatewayProxyResult } from "aws-lambda";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "../../common/container";


export const createLead: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  try {
    const newLead = await container.resolve(LeadService).createLead(event.body);
    return {
      body: JSON.stringify(newLead),
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    } as APIGatewayProxyResult;
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

const getLeadsHandler: ValidatedEventAPIGatewayProxyEvent<
  ILeadPaginated
> = async (event) => {
  try {
    const leads = await container
      .resolve(LeadService)
      .getAllLeads(event.queryStringParameters || {});
    return {
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify(leads),
      statusCode: 200,
    };
  } catch (e) {
    throw new createHttpError.InternalServerError(e.message);
  }
};

export const getLeadById: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  const { leadId } = event.pathParameters;
  try {
    const leads = await container.resolve(LeadService).getLead(leadId);
    return {
      body: JSON.stringify(leads),
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    } as APIGatewayProxyResult;
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const updateLead: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  try {
    const updatedLead = await container
      .resolve(LeadService)
      .updateLead(event.body);
    return formatJSONResponse({ updatedLead }, 200);
  } catch (e) {
    return formatJSONResponse({ error: e.message }, 500);
  }
};

export const deleteLead: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  const { leadId } = event.pathParameters;
  const leads = await container.resolve(LeadService).deleteLead(leadId);
  return formatJSONResponse({ leads }, 200);
};

const updateLeadAssignedUserHandler: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  // @TODO put auth guard
  // User must be there
  // Role guard of manager or above
  const lead = await container
    .resolve(LeadService)
    .updateLeadAssignedUser(event?.user?.sub, event.body);

  return formatJSONResponse({ lead }, 200);
};

const createConcernedPersonsHandler: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  try {
    const lead = await container
      .resolve(LeadService)
      .createConcernedPersons(event?.user?.sub, event.body);

    if (!lead) {
      return formatJSONResponse(
        {
          error: "Lead doesn't exists.",
        },
        400
      );
    }
    return formatJSONResponse({ lead }, 200);
  } catch (e) {
    return formatJSONResponse(
      {
        error: e.message,
      },
      400
    );
  }
};

const updateConcernedPersonHandler: ValidatedEventAPIGatewayProxyEvent<
  ILeadModel
> = async (event) => {
  const { id } = event.pathParameters;
  const lead = await container
    .resolve(LeadService)
    .updateConcernedPerson(id, event?.user?.sub, event.body);

  return formatJSONResponse({ lead }, 200);
};

export const getLeads = middy(getLeadsHandler).use(decodeJWTMiddleware());
export const updateLeadAssignedUser = middy(updateLeadAssignedUserHandler).use(
  decodeJWTMiddleware()
);

export const createConcernedPersons = middy(createConcernedPersonsHandler).use(
  decodeJWTMiddleware()
);

export const updateConcernedPerson = middy(updateConcernedPersonHandler).use(
  decodeJWTMiddleware()
);

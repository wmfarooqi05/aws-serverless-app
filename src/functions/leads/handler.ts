import "reflect-metadata";
import * as createHttpError from "http-errors";

import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { LeadService } from "./service";
import Lead from "./model";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "tsyringe";

export const createLead: ValidatedEventAPIGatewayProxyEvent<
  Lead
> = async (event) => {
  try {
    const lead = await container
      .resolve(LeadService)
      .createLead(event.body);
    return formatJSONResponse({ lead }, 201);
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const getLeads: ValidatedEventAPIGatewayProxyEvent<
  Lead[]
> = async () => {
  try {
    const leads = await container.resolve(LeadService).getAllLeads();
    return formatJSONResponse({ leads }, 200);
  } catch (e) {
    throw new createHttpError.InternalServerError(e);
  }
};

export const getLeadById: ValidatedEventAPIGatewayProxyEvent<
  Lead[]
> = async (event) => {
  const { leadId } = event.pathParameters;
  // try {
  const leads = await container
    .resolve(LeadService)
    .getLead(leadId);
  return formatJSONResponse({ leads }, 200);
  // } catch (e) {
  //   throw new createHttpError.InternalServerError(e);
  // }
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

import "reflect-metadata";
import * as createHttpError from "http-errors";

import { IRemarks } from "../../models/Conversation";

import {
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { ConversationService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "tsyringe";
import { APIGatewayProxyResult } from "aws-lambda";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

const addConversationHandler: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const newRemarks = await container.resolve(ConversationService).addConversation(
      // event?.user?.sub,
      "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf2", // @TODO replace with auth
      event.body,
    );
    return {
      body: JSON.stringify(newRemarks),
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

// @TODO bring conversation id in url params
export const addRemarksToConversation: ValidatedEventAPIGatewayProxyEvent<
  IRemarks
> = async (event) => {
  try {
    const newRemarks = await container.resolve(ConversationService).addRemarksToConversation(
      "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf2", // @TODO replace with auth
      // event?.user?.sub,
      event.body,
    );
    return {
      body: JSON.stringify(newRemarks),
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

export const updateRemarksInConversation: ValidatedEventAPIGatewayProxyEvent<
IRemarks
> = async (event) => {
try {
  const newRemarks = await container.resolve(ConversationService).updateRemarksInConversation(
    "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf2", // @TODO replace with auth
    // event?.user?.sub,
    event.body,
  );
  return {
    body: JSON.stringify(newRemarks),
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    },
  } as APIGatewayProxyResult;
} catch (e) {
  throw new createHttpError.InternalServerError(e.message);
}
};

export const addConversation = middy(addConversationHandler).use(decodeJWTMiddleware());

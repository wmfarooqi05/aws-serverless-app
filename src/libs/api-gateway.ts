import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { ICustomErrorArgs } from "src/helpers/custom-error";
import type { FromSchema } from "json-schema-to-ts";

type ValidatedAPIGatewayProxyEvent<S> = Omit<APIGatewayProxyEvent, "body"> & {
  body: FromSchema<S>;
};
export type ValidatedEventAPIGatewayProxyEvent<S> = Handler<
  ValidatedAPIGatewayProxyEvent<S>,
  APIGatewayProxyResult
>;

export const formatJSONResponse = (
  response: any,
  statusCode = 200
): APIGatewayProxyResult => {
  return {
    statusCode,
    body: JSON.stringify(response),
  };
};

export const corsHeaders = () => {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };
};

export const formatErrorResponse = (
  error: ICustomErrorArgs | any[] | any
): APIGatewayProxyResult => {
  return {
    statusCode: error.statusCode || 500,
    body: JSON.stringify({ message: error.message, data: error }),
  };
};

export const formatGoogleJSONResponse = (
  response: any,
  statusCode = 200
): APIGatewayProxyResult => {
  delete response.config;
  delete response.headers;
  delete response.request;

  return {
    statusCode,
    body: formatGoogleErrorBody(response),
    headers: corsHeaders(),
  };
};

export const formatGoogleErrorBody = (response) => {
  delete response.config;
  delete response.headers;
  delete response.request;
  return JSON.stringify(response);
};

export const formatGoogleErrorResponse = (error: any) => {
  return {
    statusCode: 400,
    body: JSON.stringify({
      code: error.code,
      message: error.message,
      data: error.errors,
    }),
  };
};

import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { HandlerLambda, MiddlewareObject } from "middy";
// import createHttpError from "http-errors";
import { decode } from "jsonwebtoken";
import { ICompany } from "@models/interfaces/Company";
import {
  Actions,
  getPermissionsForUserRole2,
  ModuleTypeForCasl,
} from "@libs/casl";
import { ForbiddenError } from "@casl/ability";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import { DatabaseService } from "@libs/database/database-service-objection";
import { COMPANIES_TABLE_NAME } from "@models/commons";
import { formatErrorResponse } from "@libs/api-gateway";

export const decodeJWTMiddleware = () => {
  return {
    before: ({ event }) => {
      // @TODO dont send extra things in event.user
      const token = event.headers?.Authorization?.split(" ")[1];
      event.user = decode(token);
    },
  };
};

export const decodeJWTMiddlewareWebsocket = () => {
  return {
    before: ({ event }) => {
      // @TODO dont send extra things in event.user
      if (event.queryStringParameters?.Authorization) {
        const token = event.queryStringParameters?.Authorization?.split(" ")[1];
        event.user = decode(token);
      }
    },
  };
};

export function permissionMiddleware(): MiddlewareObject<
  APIGatewayEvent,
  APIGatewayProxyResult
> {
  return {
    before: async (
      handler: HandlerLambda<APIGatewayEvent, APIGatewayProxyResult>
    ): Promise<void> => {
      console.log("user", handler.event.headers.user);
    },
  };
}

export const permissionMiddleware2 = (
  actions: Actions[],
  subject: ModuleTypeForCasl
) => {
  return {
    before: async ({ event }) => {
      const { user } = event;
      user.role = "manager";
      const resp: ICompany[] = await container
        .resolve(DatabaseService)
        .get(COMPANIES_TABLE_NAME);
      console.log("user", resp[0]?.companyName);
      const permissions = getPermissionsForUserRole2();
      const abc = permissions["manager"].rulesFor("all", "COMPANY");
      console.log("rules", abc);
      try {
        // add a pending-approval permission in header
        // service will check which action is permitted.
        // to keep logic separate
        actions.forEach((action) =>
          ForbiddenError.from(permissions[user.role]).throwUnlessCan(
            action,
            subject
          )
        );
      } catch (e) {
        return formatErrorResponse(e);
      }
    },
  };
};

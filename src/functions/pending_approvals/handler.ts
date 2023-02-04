import "reflect-metadata";

import {
  IPendingApprovalModel,
  IPendingApprovalPaginated,
} from "../../models/PendingApproval";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "../../libs/api-gateway";
import { PendingApprovalService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "../../common/container";

export const approvePendingApprovalHandler: ValidatedEventAPIGatewayProxyEvent<
  IPendingApprovalModel
> = async (event) => {
  try {
    const { requestId } = event.pathParameters;
    const resp = await container
      .resolve(PendingApprovalService)
      .approvePendingApprovalWithQuery(requestId, event.body);
    return formatJSONResponse(resp, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const approvePendingApproval = middy(approvePendingApprovalHandler).use(
  decodeJWTMiddleware()
);

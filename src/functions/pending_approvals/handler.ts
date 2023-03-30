import "reflect-metadata";

import {
  IPendingApprovalModel,
  IPendingApprovalPaginated,
} from "@models/PendingApproval";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { PendingApprovalService } from "./service";
import middy from "@middy/core";
import { decodeJWTMiddleware } from "src/common/middlewares/decode-jwt";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import {
  allowRoleWrapper,
  jwtRequiredWrapper,
} from "@libs/middlewares/jwtMiddleware";
import { RolesEnum } from "@models/interfaces/Employees";

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

// @TODO only for testing
export const sendWebSocketNotification: ValidatedEventAPIGatewayProxyEvent<
  IPendingApprovalModel
> = async (event) => {
  try {
    const resp = await container
      .resolve(PendingApprovalService)
      .sendWebSocketNotification(event.body);
    return formatJSONResponse(resp, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const getMyPendingApprovalsHandler = async (event) => {
  try {
    const resp = await container
      .resolve(PendingApprovalService)
      .getMyPendingApprovals(event.employee, event.queryStringParameters);
    return formatJSONResponse(resp, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const approveOrRejectRequestHandler = async (event) => {
  try {
    const { requestId } = event.pathParameters;
    const resp = await container
      .resolve(PendingApprovalService)
      .approveOrRejectRequest(requestId, event.employee, event.body);
    return formatJSONResponse(resp, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const approvePendingApproval = middy(approvePendingApprovalHandler).use(
  decodeJWTMiddleware()
);

export const getMyPendingApprovals = jwtRequiredWrapper(
  getMyPendingApprovalsHandler
);
export const approveOrRejectRequest = allowRoleWrapper(
  approveOrRejectRequestHandler,
  RolesEnum.SALES_MANAGER_GROUP
);

import "reflect-metadata";

import {
  IPendingApprovalModel,
} from "@models/PendingApproval";

import {
  formatErrorResponse,
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/api-gateway";
import { PendingApprovalService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "@common/container";
import {
  checkRolePermission,
} from "@libs/middlewares/jwtMiddleware";

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

// No need to guard this, just keep it open (a user will only get his related entries)
export const getMyPendingApprovals = checkRolePermission(
  getMyPendingApprovalsHandler,
  "PENDING_APPROVAL_GET_MY",
);

// No need to guard this, just keep it open (a user will only approve his authorized entries)
export const approveOrRejectRequest = checkRolePermission( 
  approveOrRejectRequestHandler,
  "PENDING_APPROVAL_APPROVE"
);

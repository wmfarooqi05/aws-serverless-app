import "reflect-metadata";

import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { EmailListService } from "./service";

// Initialize Container
// Calls to container.get() should happen per-request (i.e. inside the handler)
// tslint:disable-next-line:ordered-imports needs to be last after other imports
import { container } from "tsyringe";
import { checkRolePermission } from "@middlewares/jwtMiddleware";

// @TODO bring emailList id in url params

// @TODO bring emailList id in url params
const createLabelHandler = async (event) => {
  try {
    const newRemarks = await container
      .resolve(EmailListService)
      .createLabelHandler(event.employee, event.body);
    return formatJSONResponse(newRemarks, 201);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const createLabel = checkRolePermission(
  createLabelHandler,
  "ACTIVITY_UPDATE"
);

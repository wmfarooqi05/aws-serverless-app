import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";
import "reflect-metadata";
import { UtilService } from "./service";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { container } from "tsyringe";

export const upload = async (event) => {
  try {
    const activities = await container
      .resolve(UtilService)
      .upload(event?.employee?.sub, event);
    return formatJSONResponse(activities, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

const generateSignedUrlHandler = async (event) => {
  try {
    const signedUrls = await container
      .resolve(UtilService)
      .generateSignedUrl(event?.employee?.sub, event.body);
    return formatJSONResponse(signedUrls, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const uploadHandler = checkRolePermission(upload, "ACTIVITY_READ_ALL");

export const generateSignedUrl = checkRolePermission(
  generateSignedUrlHandler,
  "COMPANY_READ_ALL"
);

import { checkRolePermission } from "@libs/middlewares/jwtMiddleware";
import "reflect-metadata";
import { UtilService } from "./service";
import { formatErrorResponse, formatJSONResponse } from "@libs/api-gateway";
import { container } from "@common/container";

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

const getPublicUrlsHandler = async (event) => {
  try {
    const signedUrls = await container
      .resolve(UtilService)
      .getPublicUrls(event?.employee, event.body);
    return formatJSONResponse(signedUrls, 200);
  } catch (e) {
    return formatErrorResponse(e);
  }
};

export const generateSignedUrl = checkRolePermission(
  generateSignedUrlHandler,
  "COMPANY_READ_ALL"
);


export const getPublicUrls = checkRolePermission(
  getPublicUrlsHandler,
  "COMPANY_READ_ALL"
);

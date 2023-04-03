import { CustomError } from "@helpers/custom-error";
import { formatErrorResponse } from "@libs/api-gateway";

export const throwUnAuthorizedError = () => {
  throw new CustomError("You are not permitted to access this data", 403);
};

export const returnUnAuthorizedError = () => {
  return formatErrorResponse({
    message: "You are not permitted to access this data",
    statusCode: 403,
  });
};

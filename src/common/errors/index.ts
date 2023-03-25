import { CustomError } from "@helpers/custom-error";

export const throwUnAuthorizedError = () => {
  throw new CustomError("You are not permitted to access this data", 403);
};

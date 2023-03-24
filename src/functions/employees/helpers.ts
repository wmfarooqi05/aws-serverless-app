import { CustomError } from "@helpers/custom-error";
import {
  IEmployee,
  IEmployeeJwt,
  roleKey,
  RolesEnum,
} from "@models/interfaces/Employees";

export const getEmployeeFilter = (employee: IEmployeeJwt): Object => {
  // This role will never reach here, but in case it gets custom permission from manager
  // Then we also have to check custom permissions in this case
  switch (RolesEnum[employee[roleKey][0]]) {
    case RolesEnum.SALES_REP_GROUP:
      throw new CustomError(
        "This role is not authorized to see this data",
        403
      );
    case RolesEnum.REGIONAL_MANAGER_GROUP:
      return { reportingManager: employee.sub };
    case RolesEnum.REGIONAL_MANAGER_GROUP:
      return { teamId: employee.teamId };
    default:
      return {};
  }
};

export const checkManagerPermissions = (
  manager: IEmployeeJwt,
  employee: IEmployee
) => {
  if (!RolesEnum[manager["cognito:groups"][0]]) {
    throw new CustomError("No valid role present", 403);
  }
  switch (RolesEnum[manager["cognito:groups"][0]]) {
    case RolesEnum.SALES_REP_GROUP:
      throwUnAuthorizedError();
    case RolesEnum.SALES_MANAGER_GROUP:
      if (manager.sub !== employee.reportingManager) {
        throwUnAuthorizedError();
      }
      return;
    case RolesEnum.REGIONAL_MANAGER_GROUP:
      if (
        !(
          RolesEnum.REGIONAL_MANAGER_GROUP >= RolesEnum[employee.role] &&
          manager.teamId === employee.teamId
        )
      ) {
        throwUnAuthorizedError();
      }
      return;
    default:
      return;
  }
};

export const throwUnAuthorizedError = () => {
  throw new CustomError("You are not permitted to access this data", 403);
};

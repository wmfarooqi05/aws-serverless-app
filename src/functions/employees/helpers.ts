import { throwUnAuthorizedError } from "@common/errors";
import { CustomError } from "@helpers/custom-error";
import {
  IEmployee,
  IEmployeeJwt,
  IEmployeeWithTeam,
  roleKey,
  RolesEnum,
} from "@models/interfaces/Employees";

// This appears to be useless or not valid
// @TODO FIX_TEAM_ID
export const getEmployeeFilter = (
  employee: IEmployeeJwt,
  raw: boolean = false,
  alias: string = null
): Object => {
  // This role will never reach here, but in case it gets custom permission from manager
  // Then we also have to check custom permissions in this case
  let key = "";
  switch (RolesEnum[employee.role]) {
    case RolesEnum.SALES_REP:
      throw new CustomError(
        "This role is not authorized to see this data",
        403
      );
    case RolesEnum.SALES_MANAGER:
      if (raw) {
        key = "reporting_manager";
        if (alias) {
          key = `${alias}.${key}`;
        }
      } else {
        key = "reportingManager";
      }
      return { [key]: employee.sub };
    case RolesEnum.REGIONAL_MANAGER:
      if (raw) {
        key = "team_id";
        if (alias) {
          key = `${alias}.${key}`;
        }
      } else {
        key = "teamId";
      }
      return { teamId: employee.teamId };
    default:
      return {};
  }
};

/**
 * @deprecated
 * @param manager
 * @param employee
 * @returns
 */
export const checkManagerPermissions = (
  manager: IEmployeeJwt,
  employee: IEmployeeWithTeam
) => {
  if (!RolesEnum[manager["cognito:groups"][0]]) {
    throw new CustomError("No valid role present", 403);
  }
  switch (RolesEnum[manager["cognito:groups"][0]]) {
    case RolesEnum.SALES_REP:
      throwUnAuthorizedError();
    case RolesEnum.SALES_MANAGER:
      if (
        manager.sub !== employee.reportingManager &&
        manager.sub !== employee.id
      ) {
        throwUnAuthorizedError();
      }
      return;
    case RolesEnum.REGIONAL_MANAGER:
      if (
        !(
          RolesEnum.REGIONAL_MANAGER >= RolesEnum[employee.role] &&
          employee.teams.find((x) => x.id === manager.currentTeamId)
        )
      ) {
        throwUnAuthorizedError();
      }
      return;
    default:
      return;
  }
};

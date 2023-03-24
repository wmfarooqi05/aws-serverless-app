import { CustomError } from "@helpers/custom-error";
import { IEmployeeJwt, roleKey, RolesEnum } from "@models/interfaces/Employees";

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

export const checkManagerPermissions = async (
  manager: IEmployeeJwt,
  requestedUserId
) => {

  

  /**
  if (employeeJwt.sub === requestedUserId || requestedUserId === "me") return;

  const employeeRole: IEmployee = await EmployeeModel.query()
    .findById(requestedUserId)
    .returning(["role"]);

  if (
    !(
      RolesEnum[employeeJwt[roleKey][0]] >= RolesEnum.ADMIN_GROUP ||
      RolesEnum[employeeJwt[roleKey][0]] > RolesEnum[employeeRole.role]
    )
  ) {
    throw new CustomError(
      "You are not authorized to see this role's data",
      400
    );
  }
   */
};

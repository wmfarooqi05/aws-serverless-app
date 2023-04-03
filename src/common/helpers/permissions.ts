import { throwUnAuthorizedError } from "@common/errors";
import { CustomError } from "@helpers/custom-error";
import { EMPLOYEES_TABLE_NAME } from "@models/commons";
import {
  IEmployee,
  IEmployeeJwt,
  RolesEnum,
} from "@models/interfaces/Employees";
import { Knex } from "knex";

/**
 *
 * @param requestingEmployee Resource Requesting Employee (using JWT)
 * @param tableName Requesting Resource Table Name
 * @param tableRowId Requesting Resource  Table Row Id
 * @param creatorEmployeeColumnName In Requesting Resource, Column name of linked employee id
 * @param knexClient Knex Client
 */
export const validateRequestByEmployeeRole = async (
  requestingEmployee: IEmployeeJwt,
  tableName: string,
  tableRowId: string,
  creatorEmployeeColumnName: string,
  knexClient: Knex
): Promise<boolean> => {
  const originalObject = await knexClient(tableName)
    .where({ id: tableRowId })
    .first();
  if (!originalObject) return false;
  /**
   * We have to check if
   * [SalesRep] requestingEmployee is either creator of object
   * [SalesManager] Or manager of creator
   * [RegionalManager] Else, both employee has to be on same team
   * [Admin,SuperAdmin] Allowed
   */
  const employees: IEmployee[] = await knexClient(EMPLOYEES_TABLE_NAME).whereIn(
    "id",
    [requestingEmployee.sub, originalObject[creatorEmployeeColumnName]]
  );

  const requestingEmployeeObject = employees.find(
    (x) => x.id === requestingEmployee.sub
  );
  const tableRowCreator = employees.find(
    (x) => x.id === originalObject[creatorEmployeeColumnName]
  );

  if (!requestingEmployeeObject || !tableRowCreator) return false;

  switch (RolesEnum[requestingEmployee["cognito:groups"][0]]) {
    case RolesEnum.SALES_REP_GROUP:
      if (
        originalObject[creatorEmployeeColumnName] !== requestingEmployee.sub
      ) {
        throwUnAuthorizedError();
      }
      break;
    case RolesEnum.SALES_MANAGER_GROUP:
      if (
        originalObject[creatorEmployeeColumnName] !==
        requestingEmployeeObject.reportingManager
      ) {
        throwUnAuthorizedError();
      }
      break;
    case RolesEnum.REGIONAL_MANAGER_GROUP:
      if (tableRowCreator.teamId !== requestingEmployee.teamId) {
        throwUnAuthorizedError();
      }
      break;
    default:
      break;
  }
  return true;
};

import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import EmployeeModel from "@models/Employees";
import {
  IEmployee,
  IEmployeeJwt,
  roleKey,
  RolesEnum,
} from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import { validateGetEmployees, validateGetEmployeesSummary } from "./schema";
import { DatabaseService } from "@libs/database/database-service-objection";
import CompanyModel from "@models/Company";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";

export interface IEmployeeService {}

export interface EmployeeEBSchedulerPayload {
  // employeeTime: string;
  // eventType: EmployeeType;
  // name: string;
  // data?: any;
}

@injectable()
export class EmployeeService implements IEmployeeService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  /**
   * A manager will get employees under him
   * We have to solve the puzzle for a regional manager get employees
   * Maybe we can put restriction for sales rep to access this
   *
   * @param employeeId
   * @param body
   * @returns
   */
  async getEmployees(employeeId, body) {
    const payload = JSON.parse(body) || {};
    await validateGetEmployees(payload);
    try {
      const employees = await EmployeeModel.query().where({
        reportingManager: employeeId,
      });

      // This is code for employees who are not assigned to any company, place it in correct function
      /**
      this.docClient
        .get(EmployeeModel.tableName)
        .leftJoin(
          CompanyModel.tableName,
          `${EmployeeModel.tableName}.id`,
          `${CompanyModel.tableName}.assignedTo`
        )
        .whereNull(`${CompanyModel.tableName}.id`)
        .select(`${EmployeeModel}.*`);
       */
      return employees;
    } catch (e) {
      console.log("e", e);
    }
  }

  /** Start from Manager and above */
  async getEmployeesWorkSummary(employee: IEmployeeJwt, body: any) {
    // now we will determine what should be the filter for
    // filtering users
    await validateGetEmployeesSummary(body);
    const whereClause = this.getEmployeeFilter(employee);

    const knex = this.docClient.getKnexClient();
    return this.docClient
      .getKnexClient()
      .select("E.*", knex.raw("COUNT(C.id) as assigned_companies_count"))
      .from(`${EmployeeModel.tableName} as E`)
      .where(whereClause)
      .leftJoin(`${CompanyModel.tableName} as C`, "E.id", "C.assigned_to")
      .groupBy("E.id")
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async validateRequestByEmployeeRole(
    employeeJwt: IEmployeeJwt,
    requestedUserId
  ) {
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
  }
  // async;

  getEmployeeFilter(employee: IEmployeeJwt): Object {
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
  }
}

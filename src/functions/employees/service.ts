import "reflect-metadata";
// import { DatabaseService } from "../../libs/database/database-service-objection";
import { inject, injectable } from "tsyringe";
// import { randomUUID } from "crypto";
// import momentTz from "moment-timezone";
import EmployeeModel from "@models/Employees";
import { WebSocketService } from "@functions/websocket/service";
import {
  IEmployee,
  IEmployeeJwt,
  roleKey,
  RolesEnum,
} from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import { validateGetEmployees } from "./schema";
import { DatabaseService } from "@libs/database/database-service-objection";
import CompanyModel from "@models/Company";

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

      this.docClient
        .get(EmployeeModel.tableName)
        .leftJoin(
          CompanyModel.tableName,
          `${EmployeeModel.tableName}.id`,
          `${CompanyModel.tableName}.assignedTo`
        )
        .whereNull(`${CompanyModel.tableName}.id`)
        .select(`${EmployeeModel}.*`);

      return employees;
    } catch (e) {
      console.log("e", e);
    }
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
}

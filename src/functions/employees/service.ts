import "reflect-metadata";
import { inject, singleton } from "tsyringe";
import EmployeeModel from "@models/Employees";
import {
  IEmployee,
  IEmployeeJwt,
  RolesEnum,
} from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import {
  validateCreateProfile,
  validateGetEmployees,
  validateGetEmployeesSummary,
  validateUpdateProfile,
  validateUploadOrReplaceAvatar,
} from "./schema";
import { DatabaseService } from "@libs/database/database-service-objection";
import CompanyModel from "@models/Company";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import { getEmployeeFilter } from "./helpers";
import { getKeysFromS3Url } from "@utils/s3";
import { getFileExtension } from "@utils/file";
import { randomUUID } from "crypto";

export interface IEmployeeService {}

@singleton()
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
    const whereClause = getEmployeeFilter(employee);
    const { minCompanyCount, maxCompanyCount } = body;

    if (
      minCompanyCount &&
      maxCompanyCount &&
      !(minCompanyCount <= maxCompanyCount)
    ) {
      throw new CustomError(
        "minCompanyCount must be lesser or equal than maxCompanyCount",
        400
      );
    }

    const knex = this.docClient.getKnexClient();
    return this.docClient
      .getKnexClient()
      .select("E.*", knex.raw("COUNT(C.id) as assigned_companies_count"))
      .from(`${EmployeeModel.tableName} as E`)
      .where(whereClause)
      .leftJoin(`${CompanyModel.tableName} as C`, "E.id", "C.assigned_to")
      .groupBy("E.id")
      .modify((qb) => {
        if (minCompanyCount && maxCompanyCount) {
          qb.havingRaw(
            `COUNT(C.id) >= ${minCompanyCount} AND COUNT(C.id) <= ${maxCompanyCount} `
          );
        } else if (minCompanyCount) {
          qb.havingRaw(`COUNT(C.id) >= ${minCompanyCount}`);
        } else if (maxCompanyCount) {
          qb.havingRaw(`COUNT(C.id) <= ${maxCompanyCount} `);
        }
      })
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async getProfile(employee: IEmployeeJwt) {
    return EmployeeModel.query()
      .findById(employee.sub)
      .withGraphFetched("teams");
  }

  async createProfile(employee: IEmployeeJwt, body: any) {
    const payload = JSON.parse(body);
    await validateCreateProfile(payload);

    if (payload.addresses) {
      let defaultAddressCount = 0;
      payload.addresses.forEach(
        (address) => address.defaultAddress && defaultAddressCount++
      );
      if (defaultAddressCount > 1) {
        throw new CustomError("Default address cannot be more than 1", 400);
      }
    }

    let newEmployee: IEmployee = await EmployeeModel.query().insert({
      ...payload,
      reportingManager: payload.reportingManager || employee.sub,
    });

    await newEmployee
      .$relatedQuery("teams")
      .for(newEmployee.id)
      .relate(employee.currentTeamId);

    return newEmployee;
  }

  async updateMyProfile(employee: IEmployeeJwt, body: any) {
    const payload = JSON.parse(body);
    await validateUpdateProfile(payload);

    if (payload.addresses) {
      let defaultAddressCount = 0;
      payload.addresses.forEach(
        (address) => address.defaultAddress && defaultAddressCount++
      );
      if (defaultAddressCount > 1) {
        throw new CustomError("Default address cannot be more than 1", 400);
      }
    }
    await EmployeeModel.query().findById(employee.sub).patch(payload);
    return EmployeeModel.query().findById(employee.sub);
  }

  async uploadOrReplaceAvatar(employee: IEmployeeJwt, body: string) {
    const payload = JSON.parse(body);
    await validateUploadOrReplaceAvatar(employee.sub, payload);

    const employeeRecord: IEmployee = await EmployeeModel.query()
      .findById(employee.sub)
      .withGraphFetched("employeeAvatar.[variations]")
      .select(["id"]);

    if (!employeeRecord) {
      throw new CustomError("Employee not found", 400);
    }

    return this.fileRecordsService.avatarUploadHelper(
      payload.newAvatarUrl,
      "media/avatars/employees",
      EmployeeModel.tableName,
      employee.sub,
      "avatar",
      "EMPLOYEE",
      employee.sub,
      employeeRecord?.employeeAvatar
    );
  }
}

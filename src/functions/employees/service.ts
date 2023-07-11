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
import {
  validateCreateProfile,
  validateGetEmployees,
  validateGetEmployeesSummary,
  validateUpdateProfile,
} from "./schema";
import { DatabaseService } from "@libs/database/database-service-objection";
import CompanyModel from "@models/Company";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import { getEmployeeFilter } from "./helpers";
import { COMPANY_STAGES } from "@models/interfaces/Company";
import { FilePermissionsService } from "@functions/filePermissions/service";
import { getKeysFromS3Url } from "@utils/s3";
import { getFileExtension } from "@utils/file";

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
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(FilePermissionsService)
    private readonly filePermissionsService: FilePermissionsService
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

    if (payload.avatar) {
      const keys = getKeysFromS3Url(payload.avatar);
      const { contentType } =
        await this.filePermissionsService.getFileProperties(
          keys.fileKey,
          keys.bucketName
        );

      const fileName = `${newEmployee.id}.${getFileExtension(contentType)}`;
      const files =
        await this.filePermissionsService.copyFilesToBucketWithPermissions(
          [
            {
              contentType,
              destinationKey: `media/avatars/employees/${fileName}`,
              originalFilename: fileName,
              sourceBucket: keys.bucketName,
              sourceKey: keys.fileKey,
              sourceRegion: keys.region,
            },
          ],
          {
            ["*"]: { employeeId: "*", permissions: ["READ"] },
            [employee.sub]: {
              email: employee.email,
              employeeId: employee.sub,
              permissions: ["OWNER"],
            },
          }
        );
      await EmployeeModel.query().patchAndFetchById(newEmployee.id, {
        avatar: files[0].fileUrl,
      });

      newEmployee.avatar = files[0].fileUrl;
    }

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

  /**
   * this functionality was moved to jwt validator part
   * @deprecated
   * @param employeeJwt
   * @param requestedUserId
   * @returns
   */
  async validateRequestByEmployeeRole(
    employeeJwt: IEmployeeJwt,
    requestedUserId
  ) {
    // @TODO remove me clause
    if (employeeJwt.sub === requestedUserId || requestedUserId === "me") return;

    const employeeRole: IEmployee = await EmployeeModel.query()
      .findById(requestedUserId)
      .returning(["role"]);

    if (
      !(
        RolesEnum[employeeJwt.role] >= RolesEnum.ADMIN ||
        RolesEnum[employeeJwt.role] > RolesEnum[employeeRole.role]
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

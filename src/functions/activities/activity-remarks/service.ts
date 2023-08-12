import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import { validateRemarks, validateUpdateRemarks } from "./schema";

import { randomUUID } from "crypto";
import ActivityModel from "src/models/Activity";
import { IRemarks } from "src/models/interfaces/Activity";
import { EMPLOYEES_TABLE_NAME } from "src/models/commons";

import { injectable, inject } from "tsyringe";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import {
  updateHistoryHelper,
  validateJSONItemAndGetIndex,
} from "@common/json_helpers";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";

// @TODO fix this
export interface IActivityRemarksServiceService {}

@injectable()
export class ActivityRemarksService implements IActivityRemarksServiceService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async addRemarksToActivity(
    employee: IEmployeeJwt,
    activityId: string,
    body: any
  ): Promise<ActivityModel> {
    const payload = JSON.parse(body);
    await validateRemarks(employee.sub, activityId, payload);

    delete payload.activityId;

    const remarks = await this.createRemarksHelper(
      employee.sub,
      activityId,
      payload
    );

    // const activity = await ActivityModel.query()
    //   .patch(
    //     addJsonbObjectHelper("remarks", this.docClient.getKnexClient(), remarks)
    //   )
    //   .where({ id: activityId })
    //   .returning("*")
    //   .first();

    // if (!activity) {
    //   throw new CustomError("Activity not found", 404);
    // }
    // // @TODO: check if activity doens't exist
    // return activity;

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      activityId,
      employee.sub,
      ActivityModel.tableName,
      this.docClient.getKnexClient(),
      { remarks },
      PendingApprovalType.JSON_PUSH
    );
    return { remarks };
  }

  async updateRemarksInActivity(
    employee: IEmployeeJwt,
    activityId: string,
    remarksId: string,
    body: any
  ) {
    const payload = JSON.parse(body);
    await validateUpdateRemarks(employee.sub, activityId, remarksId, payload);

    const { index, originalObject } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      ActivityModel.tableName,
      activityId,
      `remarks`,
      remarksId
    );

    const newPayload = {
      ...originalObject["remarks"][index],
      ...payload,
      updatedAt: moment().utc().format(),
    };

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      activityId,
      employee.sub,
      ActivityModel.tableName,
      this.docClient.getKnexClient(),
      { remarks: newPayload },
      PendingApprovalType.JSON_UPDATE,
      remarksId
    );
    return { remarks: newPayload };
  }

  async deleteRemarkFromActivity(
    employee: IEmployeeJwt,
    activityId: string,
    remarksId: string
  ) {
    const key = "remarks";
    const { index, originalObject } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      ActivityModel.tableName,
      activityId,
      `remarks`,
      remarksId
    );

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      activityId,
      employee.sub,
      ActivityModel.tableName,
      this.docClient.getKnexClient(),
      { [key]: null },
      PendingApprovalType.JSON_DELETE,
      remarksId
    );

    return { remarks: originalObject[key][index] };
  }

  // from here, move code to helper function
  private async createRemarksHelper(
    employeeId: string,
    activityId: string,
    payload: any
  ): Promise<IRemarks> {
    // @TODO there is not check here if person's manager doesn't exists
    const employees: IEmployee[] = await this.docClient
      .getKnexClient()(EMPLOYEES_TABLE_NAME)
      .table(`${EMPLOYEES_TABLE_NAME} as u`)
      .leftJoin(`${EMPLOYEES_TABLE_NAME} as m`, "u.reporting_manager", "m.id")
      .select("u.*", "m.id as managerId", "m.name as managerName")
      .where({ "u.id": employeeId });

    return {
      id: randomUUID(),
      activityId,
      remarksText: payload.remarksText,
      employeeDetails: {
        name: employees[0].name,
        id: employees[0].id,
      },
      reportingManager: employees[0]?.managerId!
        ? {
            id: employees[0]?.managerId!,
            name: employees[0]?.managerName!,
          }
        : null,
      createdAt: moment().utc().format(),
      updatedAt: moment().utc().format(),
    } as IRemarks;
  }
}

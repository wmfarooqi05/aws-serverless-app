import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import { validateRemarks, validateUpdateRemarks } from "./schema";

import { randomUUID } from "crypto";
import ActivityModel from "src/models/Activity";
import { IRemarks } from "src/models/interfaces/Activity";
import { CustomError } from "src/helpers/custom-error";
import { EMPLOYEES_TABLE_NAME } from "src/models/commons";

import { injectable, inject } from "tsyringe";
import { IEmployee } from "@models/interfaces/Employees";
import {
  addJsonbObjectHelper,
  deleteJsonbObjectHelper,
  validateJSONItemAndGetIndex,
} from "@common/json_helpers";

// @TODO fix this
export interface IActivityRemarksServiceService {}

@injectable()
export class ActivityRemarksService implements IActivityRemarksServiceService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async addRemarksToActivity(
    employeeId: string,
    activityId: string,
    body: any
  ): Promise<ActivityModel> {
    const payload = JSON.parse(body);
    await validateRemarks(employeeId, activityId, payload);

    delete payload.activityId;

    const remarks = await this.createRemarksHelper(
      employeeId,
      activityId,
      payload
    );

    const activity = await ActivityModel.query()
      .patch(
        addJsonbObjectHelper("remarks", this.docClient.getKnexClient(), remarks)
      )
      .where({ id: activityId })
      .returning("*")
      .first();

    if (!activity) {
      throw new CustomError("Activity not found", 404);
    }
    // @TODO: check if activity doens't exist
    return activity;
  }

  async updateRemarksInActivity(
    employeeId: string,
    activityId: string,
    remarksId: string,
    body: any
  ) {
    const payload = JSON.parse(body);
    await validateUpdateRemarks(employeeId, activityId, remarksId, payload);

    const index = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      ActivityModel.tableName,
      activityId,
      `remarks`,
      remarksId
    );

    return ActivityModel.query().patchAndFetchById(activityId, {
      remarks: ActivityModel.raw(
        `
          jsonb_set(remarks, 
            '{
              ${index},
              remarksText
            }', '"${payload.remarksText}"', 
            true
          )
        `
      ),
    });
  }

  async deleteRemarkFromActivity(activityId: string, remarksId: string) {
    const index = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      ActivityModel.tableName,
      activityId,
      `remarks`,
      remarksId
    );

    await ActivityModel.query().patchAndFetchById(
      activityId,
      deleteJsonbObjectHelper("remarks", index, this.docClient.getKnexClient())
    );

    return index;
  }

  // from here, move code to helper function
  private async createRemarksHelper(
    employeeId: string,
    activityId: string,
    payload: any
  ): Promise<IRemarks> {
    // @TODO there is not check here if person's manager doesn't exists
    const employees: IEmployee[] = await this.docClient
      .knexClient(EMPLOYEES_TABLE_NAME)
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

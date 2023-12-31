import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
import { ACTIVITIES_TABLE } from "@models/commons";

import { inject, singleton, singleton } from "tsyringe";

// @TODO fix this
export interface IActivityWorkflowService {}

@singleton()
export class ActivityWorkflowService implements IActivityWorkflowService {
  private TableName: string = ACTIVITIES_TABLE;

  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async approveDeleteActivityRequest(
    pendingApprovalRequestId: string,
    employeeId: string,
  ): Promise<any> {



  }

  sanitizeColumnNames(fields: string): string | string[] {
    if (!fields) return "*";
    const columnNames = Object.keys(ActivityModel.jsonSchema.properties);
    const returningFields = fields
      .split(",")
      .filter((x) => columnNames.includes(x));

    if (returningFields.length === 0) {
      return "*";
    }
    return returningFields;
  }
}

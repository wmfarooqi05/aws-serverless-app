import "reflect-metadata";
import { DatabaseService } from "src/libs/database/database-service-objection";
import { ACTIVITIES_TABLE } from "src/models/commons";

import { injectable, inject } from "tsyringe";

// @TODO fix this
export interface IActivityWorkflowService {}

@injectable()
export class ActivityWorkflowService implements IActivityWorkflowService {
  private TableName: string = ACTIVITIES_TABLE;

  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async approveDeleteActivityRequest(
    pendingApprovalRequestId: string,
    userId: string,
  ): Promise<any> {



  }

  sanitizeActivitiesColumnNames(fields: string): string | string[] {
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
import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import { singleton, inject } from "tsyringe";

// @TODO fix this
export interface IEmailListServiceService {}

@singleton()
export class EmailListService implements IEmailListServiceService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  // async getAllEmailLists(employee: IEmployeeJwt, body: any): Promise<any> {
  //   await validateGetEmailLists(body);
  //   const { returningFields } = body;

  //   const whereClause: any = {};

  //   return this.docClient
  //     .getKnexClient()(EmailListModel.tableName)
  //     .select(sanitizeColumnNames(EmailListModel.columnNames, returningFields))
  //     .where(whereClause)
  //     .orderBy(...getOrderByItems(body))
  //     .paginate(getPaginateClauseObject(body));
  // }
}

import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import {
  validateAddEmailList,
  validateDeleteEmailList,
  validateGetEmailLists,
  validateUpdateEmailList,
} from "./schema";

import { injectable, inject } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import EmailListModel from "@models/EmailLists";
import { CustomError } from "@helpers/custom-error";
import { HttpStatusCode } from "axios";
import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";

// @TODO fix this
export interface IEmailListServiceService {}

@injectable()
export class EmailListService implements IEmailListServiceService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllEmailLists(enployee: IEmployeeJwt, body: any): Promise<any> {
    await validateGetEmailLists(body);
    const { returningFields } = body;

    const whereClause: any = {};

    return this.docClient
      .getKnexClient()(EmailListModel.tableName)
      .select(sanitizeColumnNames(EmailListModel.columnNames, returningFields))
      .where(whereClause)
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  // async getEmailListById(
  //   user: IEmployeeJwt,
  //   employeeId: string,
  //   body: any
  // ): Promise<ICompanyPaginated> {
  //   await validateGetCompanies(body);
  //   const { priority, status, stage, returningFields } = body;

  //   // @TODO remove me
  //   const whereClause: any = {
  //     assignedTo: employeeId === "me" ? user.sub : employeeId,
  //   };
  //   // @TODO move this to team interactions
  //   // if (stage) whereClause.stage = stage;

  //   return this.docClient
  //     .getKnexClient()(CompanyModel.tableName)
  //     .select(sanitizeColumnNames(CompanyModel.columnNames, returningFields))
  //     .where(whereClause)
  //     .where((builder) => {
  //       if (status) {
  //         builder.whereRaw(
  //           `details->>'status' IN (${convertToWhereInValue(status)})`
  //         );
  //       }
  //       if (priority) {
  //         builder.whereRaw(
  //           `details->>'priority' IN (${convertToWhereInValue(priority)})`
  //         );
  //       }
  //     })
  //     .orderBy(...getOrderByItems(body))
  //     .paginate(getPaginateClauseObject(body));
  // }
  async addEmailList(employee: IEmployeeJwt, body: any) {
    try {
      const payload = JSON.parse(body);
      await validateAddEmailList(employee.sub, payload);
      const { name, teamId } = payload;

      return EmailListModel.query().insert({
        updatedBy: employee.sub,
        teamId,
        name,
        nameCode: name.toLowerCase().replace(/\s+/g, "_"),
      });
    } catch (e) {
      if (e.name === "UniqueViolationError") {
        throw new CustomError("Email list name must be unique", 400);
      } else {
        throw new CustomError(e.message, HttpStatusCode.InternalServerError);
      }
    }
  }

  async updateEmailList(
    employee: IEmployeeJwt,
    emailListId: string,
    body: any
  ) {
    try {
      const payload = JSON.parse(body);
      await validateUpdateEmailList(employee.sub, emailListId, payload);
      const { name, teamId } = payload;

      const record = await EmailListModel.query().patchAndFetchById(
        emailListId,
        {
          updatedBy: employee.sub,
          teamId,
          name,
          nameCode: name.toLowerCase().replace(/\s+/g, "_"),
        }
      );
      return record;
    } catch (e) {
      if (e.name === "UniqueViolationError") {
        throw new CustomError("Email list name must be unique", 400);
      } else {
        throw new CustomError(e.message, HttpStatusCode.InternalServerError);
      }
    }
  }

  async deleteEmailList(employee: IEmployeeJwt, emailListId: string) {
    await validateDeleteEmailList(employee.sub, emailListId);
    return EmailListModel.query().deleteById(emailListId);
  }
}

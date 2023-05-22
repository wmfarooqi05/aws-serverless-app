import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import {
  validateAddContactEmailToEmailList,
  validateAddEmailList,
  validateContactEmailToEmailList,
  validateDeleteEmailList,
  validateGetEmailLists,
  validateUpdateEmailList,
} from "./schema";

import { injectable, inject } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import EmailListModel from "@models/EmailLists";
import { CustomError } from "@helpers/custom-error";
import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";
import { updateHistoryHelper } from "@common/json_helpers";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import { EMAIL_LIST_TO_CONTACT_EMAILS } from "@models/commons";

export enum HttpStatusCode {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  EarlyHints = 103,
  Ok = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  ImUsed = 226,
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  UseProxy = 305,
  Unused = 306,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  UriTooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  ImATeapot = 418,
  MisdirectedRequest = 421,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  TooEarly = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HttpVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

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
  async createEmailList(employee: IEmployeeJwt, body: any) {
    try {
      const payload = JSON.parse(body);
      await validateAddEmailList(employee.sub, payload);
      const { name, teamId } = payload;
      // let currentTeamId = employee.te

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

  async addContactEmailToEmailList(
    employee: IEmployeeJwt,
    emailListId: string,
    contactEmailId: string
  ) {
    await validateContactEmailToEmailList(
      employee.sub,
      emailListId,
      contactEmailId
    );

    await updateHistoryHelper(
      PendingApprovalType.ADD_RELATION_IN_PIVOT,
      null,
      employee.sub,
      EMAIL_LIST_TO_CONTACT_EMAILS,
      this.docClient.getKnexClient(),
      { emailListId, contactEmailId }
    );

    return { emailListToContactId: { emailListId, contactEmailId } };
  }
  async deleteContactEmailFromEmailList(
    employee: IEmployeeJwt,
    emailListId: string,
    contactEmailId: string
  ) {
    await validateContactEmailToEmailList(
      employee.sub,
      emailListId,
      contactEmailId
    );

    await updateHistoryHelper(
      PendingApprovalType.DELETE_RELATION_FROM_PIVOT,
      null,
      employee.sub,
      EMAIL_LIST_TO_CONTACT_EMAILS,
      this.docClient.getKnexClient(),
      { emailListId, contactEmailId }
    );

    return { emailListToContactId: { emailListId, contactEmailId } };
  }
}

import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";

import {
  validateAddDeleteEmailsToEmailList,
  validateAddEmailList,
  validateAddEmailsToEmailList,
  validateContactEmailToEmailList,
  validateDeleteEmailList,
  validateGetEmailLists,
  validateUpdateEmailList,
} from "./schema";

import { singleton, inject } from "tsyringe";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { CustomError } from "@helpers/custom-error";
import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";
import { updateHistoryHelper } from "@common/json_helpers";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import EmailAddressesModel, {
  IEmailAddresses,
} from "@functions/emails/models/EmailAddresses";
import EmailAddressToEmailListModel, {
  IEmailAddressToEmailListModel,
} from "../models/EmailAddressToEmailList";
import EmailListModel from "../models/EmailLists";

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

@singleton()
export class EmailListService implements IEmailListServiceService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllEmailLists(employee: IEmployeeJwt, body: any): Promise<any> {
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

  async getAllEmailsByEmailList(
    employee: IEmployeeJwt,
    emailListId,
    body: any
  ) {
    // @TODO check if it belongs to same teamId
    const { currentPage, perPage } = getPaginateClauseObject(body);
    return EmailListModel.relatedQuery("emailAddresses")
      .for(emailListId)
      .orderBy(...getOrderByItems(body))
      .page(currentPage - 1, perPage);
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

  async addEmailsToEmailList(
    employee: IEmployeeJwt,
    emailListId: string,
    body: string
  ) {
    if (!(await EmailListModel.query().findById(emailListId))) {
      throw new CustomError(`Email List ${emailListId} does not exists`, 400);
    }
    const payload = JSON.parse(body);
    await validateAddEmailsToEmailList(emailListId, payload);
    const {
      emails: inputEmails,
    }: { emails: { name?: string; email?: string; emailAddressId: string }[] } =
      payload;

    const emailAddressIds = inputEmails
      .filter((x) => x.emailAddressId)
      .map((x) => x.emailAddressId);

    const emailAddresses = inputEmails
      .filter((x) => x.email)
      .map((x) => x.email);

    const existingEmailAddresses: IEmailAddresses[] =
      await EmailAddressesModel.query()
        .whereIn("email", emailAddresses)
        .orWhereIn("id", emailAddressIds);

    const nonExistingEmails: string[] = emailAddresses.filter(
      (email: string) =>
        !existingEmailAddresses.some((existing) => existing.email === email)
    );

    let newEmailAddresses: IEmailAddresses[] = [];
    if (nonExistingEmails.length > 0) {
      const payloads = nonExistingEmails.map((email) => {
        const name = inputEmails.find((x) => x.email === email)?.name || null;
        const payload = { email, emailType: "CUSTOMER" };
        if (name) {
          payload["name"] = name;
        }
        return payload;
      });
      newEmailAddresses = await EmailAddressesModel.query().insert(payloads);
    }
    const newRelations: IEmailAddressToEmailListModel[] = [
      ...newEmailAddresses.map((x) => x.id),
      ...existingEmailAddresses.map((x) => x.id),
    ].map((x) => {
      return {
        emailAddressId: x,
        emailListId,
      };
    });

    await this.docClient
      .getKnexClient()(EmailAddressToEmailListModel.tableName)
      .insert(newRelations)
      .onConflict()
      .ignore();
  }

  async deleteEmailsFromEmailList(
    employee: IEmployeeJwt,
    emailListId: string,
    body: string
  ) {
    const payload = JSON.parse(body);
    await validateAddDeleteEmailsToEmailList(emailListId, payload);
    const { emails } = payload;
    const existingEmailAddresses: IEmailAddresses[] =
      await EmailAddressesModel.query().whereIn("email", emails);

    const deletePromises = existingEmailAddresses.map((x) => {
      return this.docClient
        .getKnexClient()(EmailAddressToEmailListModel.tableName)
        .where({ emailListId, emailAddressId: x.id })
        .delete();
    });

    const resp = await Promise.all(deletePromises);
    return existingEmailAddresses.map((x, index) => {
      return {
        email: x.email,
        deleted: !!resp[index],
      };
    });
  }

  async syncEmails() {
    const query = `
      INSERT INTO email_addresses (email, name, email_type, contact_id)
      SELECT DISTINCT
        email,
        c."name",
        'CUSTOMER',
        c."id"
      FROM
        contacts c,
        jsonb_array_elements_text(c.emails) AS email
      WHERE
        NOT EXISTS (
          SELECT
            1
          FROM
            email_addresses ea
          WHERE
            ea.email = email);
    `;

    await this.docClient.getKnexClient().raw(query);
  }
}

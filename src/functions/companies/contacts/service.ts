import "reflect-metadata";
import { ICompanyModel, ICompanyPaginated } from "@models/Company";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import { validateCreateContact, validateUpdateContact } from "./schema";

import { inject, injectable } from "tsyringe";
import { randomUUID } from "crypto";
import {
  validateJSONItemAndGetIndex,
  updateHistoryHelper,
} from "src/common/json_helpers";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import ContactModel, { IContact } from "@models/Contacts";
import ContactEmailsModel, { IContactEmails } from "@models/ContactEmails";
import EmailListModel from "@models/EmailLists";
import EmailListToContactEmailsModel from "@models/EmailListToContactEmails";
import { CustomError } from "@helpers/custom-error";

const defaultTimezone = "Canada/Eastern";

export interface IContactService {
  getAllCompanies(body: any): Promise<ICompanyPaginated>;
  createCompany(company: ICompanyModel): Promise<ICompanyModel>;
  getCompany(id: string): Promise<ICompanyModel>;
  updateCompany(
    employee: IEmployeeJwt,
    id: string,
    status: string
  ): Promise<ICompanyModel>;
  deleteCompany(employee: IEmployeeJwt, id: string): Promise<any>;
}

@injectable()
export class ContactService implements IContactService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService
  ) {}

  // We are not adding pending approval for this
  async createContacts(employee: IEmployeeJwt, companyId, body) {
    const payload = JSON.parse(body);
    // await validateCreateContact(companyId, employee.sub, payload);
    const { name, designation, phoneNumbers, timezone, emails, emailLists } =
      payload;

    let payloads = [];
    let contacts: IContact = null;
    let error = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        contacts = await ContactModel.query(trx).insert({
          name,
          designation,
          phoneNumbers,
          companyId,
          timezone: timezone ?? defaultTimezone,
        });
        if (emails?.length > 0) {
          const promises = emails.map((email) =>
            ContactEmailsModel.query(trx).insert({
              contactId: contacts.id,
              email,
            })
          );
          const emailsResps: ContactEmailsModel[] = await Promise.all(promises);

          contacts["emails"] = emailsResps;

          if (emailLists?.length > 0) {
            const emailList = await EmailListModel.query(trx).findByIds(
              emailLists
            );
            if (emailList.length === 0) {
              throw new CustomError("Email List not found", 400);
            }

            emailsResps.forEach((x) => {
              x.emailList = emailList;
              emailList.forEach((e) => {
                payloads.push({
                  emailListId: e.id,
                  contactEmailId: x.id,
                });
              });
            });

            if (payloads.length > 0) {
              await EmailListToContactEmailsModel.query(trx)
                .insert(payloads)
                .returning("contactEmailId");
            }
          }
        }
        await trx.commit();
      } catch (e) {
        error = e;
        await trx.rollback();
        throw new CustomError(e.message, 500);
      }
    });

    if (error) {
      throw new CustomError(error.message, 500);
    }

    return contacts;
  }

  async updateContact(
    companyId: string,
    contactId: string,
    employee: IEmployeeJwt,
    body
  ) {
    /**
     * Exclude this logic to a middleware
     */

    const payload = JSON.parse(body);
    await validateUpdateContact(employee.sub, companyId, contactId, payload);

    const { index, originalObject } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      ContactModel.tableName,
      companyId,
      "contacts",
      contactId
    );

    const newPayload = {
      ...originalObject["contacts"][index],
      ...payload,
      updatedAt: moment().utc().format(),
    };
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        ContactModel.tableName,
        { contacts: newPayload },
        PendingApprovalType.JSON_UPDATE,
        contactId
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      ContactModel.tableName,
      this.docClient.getKnexClient(),
      { contacts: newPayload },
      PendingApprovalType.JSON_UPDATE,
      contactId
    );
    return { contacts: newPayload };
  }

  async deleteContact(
    employee: IEmployeeJwt,
    companyId: string,
    contactId: string
  ) {
    const key = "contacts";
    const { originalObject, index } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      ContactModel.tableName,
      companyId,
      key,
      contactId
    );

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        ContactModel.tableName,
        { [key]: null },
        PendingApprovalType.JSON_DELETE,
        contactId
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      ContactModel.tableName,
      this.docClient.getKnexClient(),
      { [key]: null },
      PendingApprovalType.JSON_DELETE,
      contactId
    );

    return { contacts: originalObject[key][index] };
  }
}
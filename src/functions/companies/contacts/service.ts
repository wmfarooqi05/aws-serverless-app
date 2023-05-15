import "reflect-metadata";
import CompanyModel, {
  ICompanyModel,
  ICompanyPaginated,
} from "@models/Company";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateAddEmail,
  validateCreateContact,
  validateDeleteEmail,
  validateUpdateContact,
} from "./schema";

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
import EmailListModel, { IEmailList } from "@models/EmailLists";
import EmailListToContactEmailsModel from "@models/EmailListToContactEmails";
import { CustomError } from "@helpers/custom-error";
import UpdateHistoryModel from "@models/UpdateHistory";
import { IUpdateHistory } from "@models/interfaces/UpdateHistory";
import {
  CONTACTS_TABLE,
  CONTACT_EMAILS_TABLE,
  EMAIL_LIST_TO_CONTACT_EMAILS,
} from "@models/commons";
import { ICompany } from "@models/interfaces/Company";

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
    await validateCreateContact(companyId, employee.sub, payload);
    const {
      name,
      designation,
      phoneNumbers,
      timezone,
      details,
      emails,
      emailLists,
    } = payload;

    const emailIds = await EmailListModel.query().findByIds(emailLists);

    if (emailIds.length !== emailLists.length) {
      throw new CustomError("Some email list id doesn't exists", 400);
    }
    const company: ICompany = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company doesn't exists", 400);
    }

    let contacts: IContact = null;
    let error = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        const history: IUpdateHistory[] = [];
        contacts = await ContactModel.query(trx).insert({
          name,
          designation,
          phoneNumbers,
          timezone: timezone ?? company.timezone,
          details,
          companyId,
          createdBy: employee.sub,
        } as IContact);
        history.push({
          actionType: PendingApprovalType.CREATE,
          tableName: CONTACTS_TABLE,
          newValue: JSON.stringify(contacts),
          updatedBy: employee.sub,
        });
        const contactEmailsPromises = emails.map((x: any) =>
          ContactModel.relatedQuery("contactEmails", trx)
            .for(contacts.id)
            .insert({ contactId: contacts.id, email: x })
        );
        const contactEmails = await Promise.all(contactEmailsPromises);
        contactEmails.forEach((x) => {
          history.push({
            actionType: PendingApprovalType.CREATE,
            tableName: CONTACT_EMAILS_TABLE,
            newValue: JSON.stringify(x),
            updatedBy: employee.sub,
          });
        });

        contacts["emails"] = contactEmails;

        await Promise.all(
          contactEmails?.map((x) =>
            ContactEmailsModel.relatedQuery("emailLists", trx)
              .for(x.id)
              .relate(emailLists)
          )
        );
        contactEmails.forEach((c) => {
          emailLists.forEach((e) => {
            history.push({
              actionType: PendingApprovalType.CREATE,
              tableName: EMAIL_LIST_TO_CONTACT_EMAILS,
              newValue: JSON.stringify({
                contactEmailId: c.id,
                emailListId: e,
              }),
              updatedBy: employee.sub,
            });
          });
        });

        await UpdateHistoryModel.query(trx).insert(history);

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

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        contactId,
        employee,
        ContactModel.tableName,
        payload
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      contactId,
      employee.sub,
      ContactModel.tableName,
      this.docClient.getKnexClient(),
      payload
    );
    return { contacts: payload };
  }

  async deleteContact(employee: IEmployeeJwt, contactId: string) {
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        contactId,
        employee,
        ContactModel.tableName
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      contactId,
      employee.sub,
      ContactModel.tableName,
      this.docClient.getKnexClient()
    );

    return { contacts: null };
  }

  async addContactEmail(employee: IEmployeeJwt, contactId: string, body: any) {
    const payload = JSON.parse(body);
    await validateAddEmail(employee.sub, contactId, payload);
    const contact: IContact = await ContactModel.query().findById(contactId);
    if (!contact) {
      throw new CustomError("Contact doesn't exists", 400);
    }

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.CREATE,
        null,
        employee,
        ContactEmailsModel.tableName,
        payload
      );
    }

    payload.contactId = contactId;
    const resp = await updateHistoryHelper(
      PendingApprovalType.CREATE,
      null,
      employee.sub,
      ContactEmailsModel.tableName,
      this.docClient.getKnexClient(),
      payload
    );
    return { contactEmail: resp[0].rows[0] };
  }

  async deleteContactEmail(employee: IEmployeeJwt, emailId: string) {
    await validateDeleteEmail(employee.sub, emailId);
    const contactEmail: IContact = await ContactEmailsModel.query().findById(
      emailId
    );
    if (!contactEmail) {
      throw new CustomError("Contact Email doesn't exists", 400);
    }

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.DELETE,
        emailId,
        employee,
        ContactEmailsModel.tableName
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.DELETE,
      emailId,
      employee.sub,
      ContactEmailsModel.tableName,
      this.docClient.getKnexClient()
    );
    return { contactEmail: { id: emailId } };
  }
}

import "reflect-metadata";
import CompanyModel from "@models/Company";
import { DatabaseService } from "@libs/database/database-service-objection";

import {
  validateCreateContact,
  validateUpdateContact,
  validateUploadOrReplaceAvatar,
} from "./schema";

import { inject, singleton } from "tsyringe";
import { updateHistoryHelper } from "src/common/json_helpers";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import ContactModel, { IContact } from "@models/Contacts";
import { CustomError } from "@helpers/custom-error";
import { ICompany } from "@models/interfaces/Company";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";

@singleton()
export class ContactService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  getAllContactQuery(body, whereClause = {}) {
    const { name, designation, phoneNumber, timezone, companyId, createdBy } =
      body;

    return this.docClient
      .getKnexClient()(ContactModel.tableName)
      .where(whereClause)
      .modify((qb) => {
        name && qb.where("name", "like", `%${name}%`);
        designation && qb.where("designation", designation);
        phoneNumber?.length && qb.where("phone_numbers", "?", `${phoneNumber}`);
        timezone && qb.where("timezone", timezone);
        companyId && qb.where("company_id", companyId);
        createdBy && qb.where("created_by", createdBy);
      })
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async getAllContacts(employee: IEmployeeJwt, body: any) {
    return this.getAllContactQuery(body);
  }

  async getContactsByCompany(employee: IEmployeeJwt, companyId, body) {
    delete body.companyId;
    return this.getAllContactQuery(body, { companyId });
  }
  async getContactById(employee: IEmployeeJwt, contactId) {
    return ContactModel.query().where({ id: contactId });
  }

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
      // emailLists,
    } = payload;

    const company: ICompany = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company doesn't exists", 400);
    }

    const resp = await updateHistoryHelper(
      PendingApprovalType.CREATE,
      null,
      employee.sub,
      ContactModel.tableName,
      this.docClient.getKnexClient(),
      {
        name,
        designation,
        phoneNumbers,
        timezone: timezone ?? company.timezone,
        details,
        companyId,
        createdBy: employee.sub,
        emails,
      } as IContact
    );

    return { contact: resp[0].rows[0] };
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


    // Update and also put current version in history table
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
    // It will delete the contact but also keep its copy in history table
    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      contactId,
      employee.sub,
      ContactModel.tableName,
      this.docClient.getKnexClient()
    );

    return { contacts: null };
  }

  async uploadOrReplaceAvatar(
    employee: IEmployeeJwt,
    companyId: string,
    contactId: string,
    body: string
  ) {
    const payload = JSON.parse(body);
    await validateUploadOrReplaceAvatar(
      employee.sub,
      companyId,
      contactId,
      payload
    );
    /**
     * We have determined that this is new url
     * Now we have to upload it to S3 and create record
     * of file permissions. Then also add a job for image
     * processing.
     */

    const contactRecord: IContact = await ContactModel.query()
      .findById(contactId)
      .withGraphFetched("contactAvatar.[variations]")
      .select(["id", "companyId"]);

    if (!contactRecord) {
      throw new CustomError("Contact not found", 400);
    } else if (contactRecord.companyId !== companyId) {
      throw new CustomError("Contact doesn't belong to this company", 400);
    }

    // return this.fileRecordService.avatarUploadHelper();
  }
}

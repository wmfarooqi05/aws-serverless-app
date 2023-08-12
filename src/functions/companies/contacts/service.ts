import "reflect-metadata";
import CompanyModel, {
  ICompanyModel,
  ICompanyPaginated,
} from "@models/Company";
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
import { PendingApprovalService } from "@functions/pending_approvals/service";
import ContactModel, { IContact } from "@models/Contacts";
import { CustomError } from "@helpers/custom-error";
import { ICompany } from "@models/interfaces/Company";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import { FileRecordService } from "@functions/fileRecords/service";

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

@singleton()
export class ContactService implements IContactService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService,
    @inject(FileRecordService)
    private readonly fileRecordService: FileRecordService
  ) {}

  getAllContactQuery(body, whereClause = {}) {
    const {
      name,
      designation,
      phoneNumber,
      timezone,
      companyId,
      createdBy,
      returningFields,
    } = body;

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
  // async getCompanyQuery(employee: IEmployeeJwt, body, whereClause = {}) {
  // const { name, designation, phoneNumbers, timezone, companyId, createdBy, returningFields } = body;

  //   // @TODO move this to team interactions
  //   // if (stage) {
  //   //   whereClause["stage"] = stage;
  //   // }
  //   const knex = this.docClient.getKnexClient();
  //   const returningKeys = returningFields;//this.getSelectKeys(returningFields);

  //   const companies = await knex(`${CompanyModel.tableName} as c`)
  //     .leftJoin(`${EMPLOYEE_COMPANY_INTERACTIONS_TABLE} as ec`, (join) => {
  //       join.on("ec.employee_id", "=", knex.raw("?", [employee.sub])); // Use parameter binding
  //     })
  //     .leftJoin(`${TEAM_COMPANY_INTERACTIONS_TABLE} as tc`, (join) => {
  //       join.on("tc.team_id", "=", knex.raw("?", [employee.teamId]));
  //     })
  //     .select(returningKeys)
  //     .where(whereClause)
  //     .modify((builder) => {
  //       if (status) {
  //         builder.whereRaw(`ec.'status' IN (${convertToWhereInValue(status)})`);
  //       }
  //       if (priority) {
  //         builder.whereRaw(
  //           `ec.'priority' = (${convertToWhereInValue(priority)})`
  //         );
  //       }
  //       if (stage) {
  //         builder.whereRaw(`tc.'stage' IN (${convertToWhereInValue(stage)})`);
  //       }
  //     })
  //     .orderBy(...getOrderByItems(body, "c"))
  //     .paginate(getPaginateClauseObject(body));

  //   return {
  //     data: companies?.data?.map((x) =>
  //       this.validateCompanyWithInteractions(x)
  //     ),
  //     pagination: companies?.pagination,
  //   };
  // }

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
        PendingApprovalType.DELETE,
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

    return this.fileRecordService.avatarUploadHelper(
      payload.newAvatarUrl,
      "media/avatars/contacts",
      ContactModel.tableName,
      contactId,
      "avatar",
      "EMPLOYEE",
      employee.sub,
      contactRecord?.contactAvatar
    );
  }

  // async addContactEmail(employee: IEmployeeJwt, contactId: string, body: any) {
  //   const payload = JSON.parse(body);
  //   await validateAddEmail(employee.sub, contactId, payload);
  //   const contact: IContact = await ContactModel.query().findById(contactId);
  //   if (!contact) {
  //     throw new CustomError("Contact doesn't exists", 400);
  //   }

  //   const { permitted, createPendingApproval } = employee;
  //   if (!permitted && createPendingApproval) {
  //     return this.pendingApprovalService.createPendingApprovalRequest(
  //       PendingApprovalType.CREATE,
  //       null,
  //       employee,
  //       ContactEmailsModel.tableName,
  //       payload
  //     );
  //   }

  //   payload.contactId = contactId;
  //   const resp = await updateHistoryHelper(
  //     PendingApprovalType.CREATE,
  //     null,
  //     employee.sub,
  //     ContactEmailsModel.tableName,
  //     this.docClient.getKnexClient(),
  //     payload
  //   );
  //   return { contactEmail: resp[0].rows[0] };
  // }

  // async deleteContactEmail(employee: IEmployeeJwt, emailId: string) {
  //   await validateDeleteEmail(employee.sub, emailId);
  //   const contactEmail: IContact = await ContactEmailsModel.query().findById(
  //     emailId
  //   );
  //   if (!contactEmail) {
  //     throw new CustomError("Contact Email doesn't exists", 400);
  //   }

  //   const { permitted, createPendingApproval } = employee;
  //   if (!permitted && createPendingApproval) {
  //     return this.pendingApprovalService.createPendingApprovalRequest(
  //       PendingApprovalType.DELETE,
  //       emailId,
  //       employee,
  //       ContactEmailsModel.tableName
  //     );
  //   }

  //   await updateHistoryHelper(
  //     PendingApprovalType.DELETE,
  //     emailId,
  //     employee.sub,
  //     ContactEmailsModel.tableName,
  //     this.docClient.getKnexClient()
  //   );
  //   return { contactEmail: { id: emailId } };
  // }
}

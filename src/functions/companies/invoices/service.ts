import "reflect-metadata";
import CompanyModel, {
  ICompanyModel,
  ICompanyPaginated,
} from "@models/Company";
import { DatabaseService } from "@libs/database/database-service-objection";

import { validateCreateInvoice, validateUpdateInvoice } from "./schema";

import { inject, injectable } from "tsyringe";
import { updateHistoryHelper } from "src/common/json_helpers";
import { PendingApprovalType } from "@models/interfaces/PendingApprovals";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import InvoiceModel, { IInvoice } from "@models/Invoices";
import { CustomError } from "@helpers/custom-error";
import { ICompany } from "@models/interfaces/Company";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";

export interface IInvoiceService {
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
export class InvoiceService implements IInvoiceService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService
  ) {}

  getAllInvoiceQuery(body, whereClause = {}) {
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
      .getKnexClient()(InvoiceModel.tableName)
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

  async getAllInvoices(employee: IEmployeeJwt, body: any) {
    return this.getAllInvoiceQuery(body);
  }

  async getInvoicesByCompany(employee: IEmployeeJwt, companyId, body) {
    delete body.companyId;
    return this.getAllInvoiceQuery(body, { companyId });
  }
  async getInvoiceById(employee: IEmployeeJwt, contactId) {
    return InvoiceModel.query().where({ id: contactId });
  }

  async createInvoices(employee: IEmployeeJwt, companyId, body) {
    const payload = JSON.parse(body);
    await validateCreateInvoice(companyId, employee.sub, payload);
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
      InvoiceModel.tableName,
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
      } as IInvoice
    );

    return { contact: resp[0].rows[0] };
  }

  async updateInvoice(
    companyId: string,
    contactId: string,
    employee: IEmployeeJwt,
    body
  ) {
    /**
     * Exclude this logic to a middleware
     */

    const payload = JSON.parse(body);
    await validateUpdateInvoice(employee.sub, companyId, contactId, payload);

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        contactId,
        employee,
        InvoiceModel.tableName,
        payload
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      contactId,
      employee.sub,
      InvoiceModel.tableName,
      this.docClient.getKnexClient(),
      payload
    );
    return { contacts: payload };
  }

  async deleteInvoice(employee: IEmployeeJwt, contactId: string) {
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.DELETE,
        contactId,
        employee,
        InvoiceModel.tableName
      );
    }
    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      contactId,
      employee.sub,
      InvoiceModel.tableName,
      this.docClient.getKnexClient()
    );

    return { contacts: null };
  }
}

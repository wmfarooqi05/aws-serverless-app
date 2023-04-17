import "reflect-metadata";
import CompanyModel, {
  ICompanyModel,
  ICompanyPaginated,
} from "@models/Company";
import {
  IConcernedPerson,
  ICompany,
  INotes,
  COMPANY_PRIORITY,
  COMPANY_STATUS,
  COMPANY_STAGES,
} from "@models/interfaces/Company";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateUpdateCompanyAssignedEmployee,
  validateGetCompanies,
  validateUpdateCompanies,
  validateCreateConcernedPerson,
  validateUpdateConcernedPerson,
  validateCreateCompany,
  validateGetNotes,
  validateAddNotes,
  validateUpdateNotes,
  validateDeleteNotes,
  validateUpdateCompaniesAssignedEmployee,
} from "./schema";

import { inject, injectable } from "tsyringe";
import ActivityModel from "@models/Activity";
import { randomUUID } from "crypto";
import { CustomError } from "src/helpers/custom-error";
import {
  convertToWhereInValue,
  validateJSONItemAndGetIndex,
  updateHistoryHelper,
  snakeToCamel,
  createKnexTransactionQueries,
} from "src/common/json_helpers";
import {
  IPendingApprovals,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
import { IEmployeeJwt } from "@models/interfaces/Employees";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";
import { EmployeeService } from "@functions/employees/service";
import Joi from "joi";
import { EMPLOYEE_COMPANY_INTERACTIONS_TABLE } from "@models/commons";
import EmployeeCompanyInteractionsModel from "@models/EmployeeCompanyInteractions";

export interface ICompanyService {
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
export class CompanyService implements ICompanyService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService,
    @inject(EmployeeService) private readonly employeeService: EmployeeService
  ) {}

  async getAllCompanies(
    employee: IEmployeeJwt,
    body: any
  ): Promise<ICompanyPaginated> {
    await validateGetCompanies(body);
    return this.getCompanyQuery(employee.sub, body);
  }

  async getCompaniesByEmployeeId(
    employee: IEmployeeJwt,
    employeeId: string,
    body: any
  ): Promise<ICompanyPaginated> {
    await validateGetCompanies(body);
    // @TODO remove me
    const whereClause: any = {
      assignedTo: employeeId === "me" ? employee.sub : employeeId,
    };

    return this.getCompanyQuery(employee.sub, body, whereClause);
  }

  async getCompanyQuery(employeeId, body, whereClause = {}) {
    const { priority, status, stage, returningFields } = body;

    if (stage) {
      whereClause["stage"] = stage;
    }
    const knex = this.docClient.getKnexClient();
    const returningKeys = this.getSelectKeys(returningFields);

    const companies = await knex(`${CompanyModel.tableName} as c`)
      .leftJoin(`${EMPLOYEE_COMPANY_INTERACTIONS_TABLE} as ec`, (join) => {
        join.on("ec.employee_id", "=", knex.raw("?", [employeeId])); // Use parameter binding
      })
      .select(returningKeys)
      .where(whereClause)
      .modify((builder) => {
        if (status) {
          builder.whereRaw(`ec.'status' IN (${convertToWhereInValue(status)})`);
        }
        if (priority) {
          builder.whereRaw(
            `ec.'priority' = (${convertToWhereInValue(priority)})`
          );
        }
      })
      .orderBy(...getOrderByItems(body, "c"))
      .paginate(getPaginateClauseObject(body));

    return {
      data: companies?.data?.map((x) =>
        this.validateCompanyWithInteractions(x)
      ),
      pagination: companies?.pagination,
    };
  }

  async getCompany(employee: IEmployeeJwt, id: string): Promise<ICompanyModel> {
    const companies = await this.getCompanyQuery(employee.sub, {}, { id });
    if (companies?.data?.length === 0) {
      throw new CustomError("Company not found", 404);
    }
    const company = companies.data[0];
    const activities = await ActivityModel.query().where({
      companyId: id,
    });
    company["activities"] = activities;
    return company;
  }

  async createCompany(
    employee: IEmployeeJwt,
    body: any
  ): Promise<{ company?: CompanyModel; pendingApproval?: IPendingApprovals }> {
    const payload = JSON.parse(body);
    payload.createdBy = employee.sub;
    await validateCreateCompany(payload);

    const timeNow = moment().utc().format();
    payload.concernedPersons = payload.concernedPersons?.map((x: any) => {
      return {
        ...x,
        id: randomUUID(),
        createdAt: timeNow,
        updatedAt: timeNow,
        emailList: x.emailList ?? [],
      } as IConcernedPerson;
    });
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.CREATE,
        null,
        employee,
        CompanyModel.tableName,
        payload
      );
    }

    let company = null;
    await this.docClient.getKnexClient().transaction(async (trx) => {
      const finalQueries = await createKnexTransactionQueries(
        PendingApprovalType.CREATE,
        null,
        employee.sub,
        CompanyModel.tableName,
        this.docClient.getKnexClient(),
        payload
      );
      const resp = await trx.raw(finalQueries[0].toString());
      company = snakeToCamel(resp.rows[0]);
      await trx.raw(finalQueries[1].toString());
    });

    return { company };
  }

  async updateCompany(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<{ company?: CompanyModel; pendingApproval?: IPendingApprovals }> {
    const payload = JSON.parse(body);
    await validateUpdateCompanies(id, payload);

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        id,
        employee,
        CompanyModel.tableName,
        payload
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      id,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      payload
    );

    const company = await CompanyModel.query().findById(id);
    return { company };
  }

  async deleteCompany(
    employee: IEmployeeJwt,
    id: string
  ): Promise<{
    company?: Pick<ICompany, "id">;
    pendingApproval?: IPendingApprovals;
  }> {
    await Joi.object({
      id: Joi.string().uuid().required(),
    }).validateAsync({ id });
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.DELETE,
        id,
        employee,
        CompanyModel.tableName
      );
    }
    await updateHistoryHelper(
      PendingApprovalType.DELETE,
      id,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient()
    );
    return { company: { id } };
  }

  /**
   * Bulk assignment
   * @param employee
   * @param companyId
   * @param body
   */
  async updateCompaniesAssignedEmployee(employee: IEmployeeJwt, body) {
    const payload = JSON.parse(body);
    await validateUpdateCompaniesAssignedEmployee(employee.sub, payload);

    const { companyIds }: { companyIds: string[]; action: string } = payload;
    const companies: ICompany[] = await CompanyModel.query().findByIds(
      companyIds
    );

    if (companies.length !== companyIds.length) {
      throw new CustomError(
        `Companies with ids ${companyIds
          .filter((x) => !companies.find((y) => y.id === x))
          .join(",")} not found`,
        400
      );
    }
    const { permitted, createPendingApproval } = employee;
    const batchApprovalKey = randomUUID();
    if (!permitted && createPendingApproval) {
      const pendingApprovalPromises = companyIds.map((x) =>
        this.pendingApprovalService.createPendingApprovalRequest(
          PendingApprovalType.UPDATE,
          x,
          employee,
          CompanyModel.tableName,
          { assignedTo: payload?.assignTo ?? null },
          null,
          null,
          batchApprovalKey
        )
      );
      return Promise.all(pendingApprovalPromises);
    }
    const updatePromises = companyIds.map((x) =>
      updateHistoryHelper(
        PendingApprovalType.UPDATE,
        x,
        employee.sub,
        CompanyModel.tableName,
        this.docClient.getKnexClient(),
        { assignedTo: payload?.assignTo ?? null }
      )
    );

    await Promise.all(updatePromises);
    return {
      companies: companyIds.map((x) => {
        return { id: x, assignedTo: payload?.assignTo ?? null };
      }),
    };
  }

  async updateCompanyAssignedEmployee(employee: IEmployeeJwt, companyId, body) {
    // @TODO: @Auth this employee should be the manager of changing person
    // @Paul No need for pending approval [Check with Paul]
    const payload = JSON.parse(body);
    await validateUpdateCompanyAssignedEmployee(
      companyId,
      employee.sub,
      payload
    );
    const company = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { assignedTo: payload?.assignTo ?? null }
      );
    }
    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { assignedTo: payload?.assignTo ?? null }
    );

    return { company: { ...company, assignedTo: payload?.assignTo ?? null } };
  }

  async createConcernedPersons(employee: IEmployeeJwt, companyId, body) {
    const payload = JSON.parse(body);
    await validateCreateConcernedPerson(companyId, employee.sub, payload);

    const date = moment().utc().format();

    payload["id"] = randomUUID();
    payload["addedBy"] = employee.sub;
    payload["updatedBy"] = employee.sub;
    payload["createdAt"] = date;
    payload["updatedAt"] = date;

    /** @TODO */
    /** we have to create a list of operations of roles or permissions
     *  Store it in redis, fetch here and check if create is permitted by default or not
     * if yes, then ok, otherwise put this in pending approval
     *  */
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { concernedPersons: payload },
        PendingApprovalType.JSON_PUSH,
        null
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { concernedPersons: payload },
      PendingApprovalType.JSON_PUSH,
      null
    );

    return { concernedPersons: payload };
  }

  async updateConcernedPerson(
    companyId: string,
    concernedPersonId: string,
    employee: IEmployeeJwt,
    body
  ) {
    /**
     * Exclude this logic to a middleware
     */

    const payload = JSON.parse(body);
    await validateUpdateConcernedPerson(
      employee.sub,
      companyId,
      concernedPersonId,
      payload
    );

    const { index, originalObject } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      CompanyModel.tableName,
      companyId,
      "concernedPersons",
      concernedPersonId
    );

    const newPayload = {
      ...originalObject["concernedPersons"][index],
      ...payload,
      updatedAt: moment().utc().format(),
    };
    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { concernedPersons: newPayload },
        PendingApprovalType.JSON_UPDATE,
        concernedPersonId
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { concernedPersons: newPayload },
      PendingApprovalType.JSON_UPDATE,
      concernedPersonId
    );
    return { concernedPersons: newPayload };
  }

  async deleteConcernedPerson(
    employee: IEmployeeJwt,
    companyId: string,
    concernedPersonId: string
  ) {
    const key = "concernedPersons";
    const { originalObject, index } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      CompanyModel.tableName,
      companyId,
      key,
      concernedPersonId
    );

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { [key]: null },
        PendingApprovalType.JSON_DELETE,
        concernedPersonId
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { [key]: null },
      PendingApprovalType.JSON_DELETE,
      concernedPersonId
    );

    return { concernedPersons: originalObject[key][index] };
  }

  // Notes
  async getNotes(employee: IEmployeeJwt, companyId: any) {
    await validateGetNotes(employee.sub, companyId);
    const notes = await this.docClient
      .getKnexClient()(CompanyModel.tableName)
      .select(["notes"])
      .where({ id: companyId })
      .first();
    return notes.notes;
  }

  // Notes
  async createNotes(employee: IEmployeeJwt, companyId: string, body: any) {
    const payload = JSON.parse(body);
    if (payload) {
      await validateAddNotes(employee.sub, companyId, payload);
    }
    const notes: INotes = {
      id: randomUUID(),
      addedBy: employee.sub,
      isEdited: false,
      notesText: payload.notesText,
      updatedAt: moment().utc().format(),
    };

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { notes },
        PendingApprovalType.JSON_PUSH,
        null
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { notes },
      PendingApprovalType.JSON_PUSH,
      null
    );

    return { notes };
  }

  async updateNotes(
    employee: IEmployeeJwt,
    companyId: string,
    notesId: string,
    body
  ) {
    const payload = JSON.parse(body);
    await validateUpdateNotes(employee.sub, companyId, notesId, payload);

    const { index, originalObject } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      CompanyModel.tableName,
      companyId,
      "notes",
      notesId
    );

    const notes = {
      ...originalObject["notes"][index],
      ...payload,
      updatedAt: moment().utc().format(),
    };

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { notes },
        PendingApprovalType.JSON_UPDATE,
        notesId
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { notes },
      PendingApprovalType.JSON_UPDATE,
      notesId
    );
    return { notes };
  }

  async deleteNotes(
    employee: IEmployeeJwt,
    companyId: string,
    notesId: string
  ) {
    // @ADD some query to find index of id directly
    await validateDeleteNotes({ companyId, notesId });
    const key = "notes";
    const { originalObject, index } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      CompanyModel.tableName,
      companyId,
      key,
      notesId
    );

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        PendingApprovalType.UPDATE,
        companyId,
        employee,
        CompanyModel.tableName,
        { [key]: null },
        PendingApprovalType.JSON_DELETE,
        notesId
      );
    }

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      CompanyModel.tableName,
      this.docClient.getKnexClient(),
      { [key]: null },
      PendingApprovalType.JSON_DELETE,
      notesId
    );

    return { notes: originalObject[key][index] };
  }

  permissionResolver() {
    /**
     * We have to resolve these things
     * If this key is permitted to be updated
     * If assigned_employee is permitted to be updated
     * If his manager is permitted to be updated
     *
     * Even if key is allowed to change, we have to check if every sales rep can update it
     * or only the one assigned on it
     */
  }

  getSelectKeys(returningFields) {
    let returningKeys = sanitizeColumnNames(
      CompanyModel.columnNames,
      returningFields,
      "c"
    );

    const secondKeys = sanitizeColumnNames(
      EmployeeCompanyInteractionsModel.validSchemaKeys,
      returningFields,
      "ec",
      true
    );
    if (Array.isArray(returningKeys)) {
      if (Array.isArray(secondKeys)) {
        returningKeys = [...returningKeys, ...secondKeys];
      } else {
        returningKeys = [...returningKeys, secondKeys];
      }
    } else if (typeof returningKeys === "string") {
      if (Array.isArray(secondKeys)) {
        returningKeys = [returningKeys, ...secondKeys];
      } else {
        returningKeys = [returningKeys, secondKeys];
      }
    }

    return returningKeys;
  }

  validateCompanyWithInteractions(companyItem) {
    return {
      ...companyItem,
      priority: companyItem?.priority ?? COMPANY_PRIORITY.NO_PRIORITY,
      status: companyItem?.status ?? COMPANY_STATUS.NONE,
      stage: companyItem?.stage ?? COMPANY_STAGES.LEAD,
      notes: companyItem?.notes ?? [],
      interactionDetails: companyItem?.interactionDetails ?? {},
    };
  }
}

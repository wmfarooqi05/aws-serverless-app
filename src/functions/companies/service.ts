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
  validateUpdateCompanyInteractions,
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
import {
  EMPLOYEE_COMPANY_INTERACTIONS_TABLE,
  TEAM_COMPANY_INTERACTIONS_TABLE,
} from "@models/commons";
import EmployeeCompanyInteractionsModel, {
  IEmployeeCompanyInteraction,
  IEmployeeCompanyInteractionsModel,
  defaultInteractionItem,
  getDefaultEmployeeInteractionItem,
} from "@models/EmployeeCompanyInteractions";
import TeamCompanyInteractionsModel, {
  ITeamCompanyInteraction,
  getDefaultTeamInteractionItem,
} from "@models/TeamCompanyInteractions";
import TeamModel, { ITeam } from "@models/Teams";

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
    return this.getCompanyQuery(employee, body);
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

    return this.getCompanyQuery(employee, body, whereClause);
  }

  async getCompanyQuery(employee: IEmployeeJwt, body, whereClause = {}) {
    const { priority, status, stage, returningFields } = body;

    // @TODO move this to team interactions
    // if (stage) {
    //   whereClause["stage"] = stage;
    // }
    const knex = this.docClient.getKnexClient();
    const returningKeys = this.getSelectKeys(returningFields);

    const companies = await knex(`${CompanyModel.tableName} as c`)
      .leftJoin(`${EMPLOYEE_COMPANY_INTERACTIONS_TABLE} as ec`, (join) => {
        join.on("ec.employee_id", "=", knex.raw("?", [employee.sub])); // Use parameter binding
      })
      .leftJoin(`${TEAM_COMPANY_INTERACTIONS_TABLE} as tc`, (join) => {
        join.on("tc.team_id", "=", knex.raw("?", [employee.teamId]));
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
        if (stage) {
          builder.whereRaw(`tc.'stage' IN (${convertToWhereInValue(stage)})`);
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
    const companies = await this.getCompanyQuery(employee, {}, { "c.id": id });
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

    return { company: this.validateCompanyWithInteractions(company) };
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

  async updateCompanyEmployeeInteractions(
    employee: IEmployeeJwt,
    companyId: string,
    body: any
  ) {
    const payload = JSON.parse(body);
    await validateUpdateCompanyInteractions(payload, employee.sub, companyId);

    const company: ICompany = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }

    const interactionRecord: IEmployeeCompanyInteraction =
      await EmployeeCompanyInteractionsModel.query()
        .where({
          companyId,
          employeeId: employee.sub,
        })
        .first();

    const id = interactionRecord?.id ?? null;
    const action = interactionRecord?.id
      ? PendingApprovalType.UPDATE
      : PendingApprovalType.CREATE;

    const defaultPayload = {
      ...getDefaultEmployeeInteractionItem(employee.sub, companyId),
      // ...this.getDefaultTeamInteractionItem(employee),
      ...payload,
    };
    // As they belongs to employee, we don't need any approval
    await updateHistoryHelper(
      action,
      id,
      employee.sub,
      EmployeeCompanyInteractionsModel.tableName,
      this.docClient.getKnexClient(),
      action === PendingApprovalType.CREATE ? defaultPayload : payload
    );

    return {
      company: this.validateCompanyWithInteractions({
        ...company,
        ...payload,
      }),
    };
  }

  async convertCompany(employee: IEmployeeJwt, companyId: string) {
    const company: ICompany = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }

    const teamInteraction: ITeamCompanyInteraction =
      await TeamCompanyInteractionsModel.query()
        .where({
          companyId,
          teamId: employee.teamId,
        })
        .first();

    if (teamInteraction.stage === COMPANY_STAGES.CONTACT) {
      throw new CustomError("Company is already converted to contact", 400);
    }
    const id = teamInteraction?.id ?? null;
    const action = teamInteraction?.id
      ? PendingApprovalType.UPDATE
      : PendingApprovalType.CREATE;

    const payload =
      action === PendingApprovalType.CREATE
        ? {
            ...getDefaultTeamInteractionItem(employee, companyId),
            stage: COMPANY_STAGES.CONTACT,
          }
        : { stage: COMPANY_STAGES.CONTACT };

    const { permitted, createPendingApproval } = employee;
    if (!permitted && createPendingApproval) {
      return this.pendingApprovalService.createPendingApprovalRequest(
        action,
        id,
        employee,
        TeamCompanyInteractionsModel.tableName,
        payload
      );
    }

    await updateHistoryHelper(
      action,
      id,
      employee.sub,
      TeamCompanyInteractionsModel.tableName,
      this.docClient.getKnexClient(),
      payload
    );

    return { company: { stage: COMPANY_STAGES.CONTACT } };
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

  /*** Notes are personal items, so no validations */
  // Notes
  async getNotes(employee: IEmployeeJwt, companyId: any) {
    await validateGetNotes(employee.sub, companyId);
    const interactionItem: IEmployeeCompanyInteraction = await this.docClient
      .getKnexClient()(EmployeeCompanyInteractionsModel.tableName)
      .select(["notes"])
      .where({ companyId, employeeId: employee.sub })
      .first();
    return (
      interactionItem?.notes.sort(
        (a: INotes, b: INotes) =>
          Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      ) ?? []
    );
  }

  // Notes
  async createNotes(employee: IEmployeeJwt, companyId: string, body: any) {
    const payload = JSON.parse(body);
    await validateAddNotes(employee.sub, companyId, payload);
    const notes: INotes = {
      id: randomUUID(),
      addedBy: employee.sub,
      isEdited: false,
      notesText: payload.notesText,
      updatedAt: moment().utc().format(),
    };

    const interactionItem: IEmployeeCompanyInteraction =
      await EmployeeCompanyInteractionsModel.query()
        .where({
          companyId,
          employeeId: employee.sub,
        })
        .first();

    if (interactionItem?.id) {
      await updateHistoryHelper(
        PendingApprovalType.UPDATE,
        interactionItem.id,
        employee.sub,
        EmployeeCompanyInteractionsModel.tableName,
        this.docClient.getKnexClient(),
        { notes },
        PendingApprovalType.JSON_PUSH,
        null
      );
    } else {
      await updateHistoryHelper(
        PendingApprovalType.CREATE,
        null,
        employee.sub,
        EmployeeCompanyInteractionsModel.tableName,
        this.docClient.getKnexClient(),
        {
          ...getDefaultEmployeeInteractionItem(employee.sub, companyId),
          notes: [notes],
        }
      );
    }
    return {
      notes: interactionItem?.id
        ? interactionItem.notes?.concat(notes)
        : [notes],
    };
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
      EmployeeCompanyInteractionsModel.tableName,
      { companyId, employeeId: employee.sub },
      "notes",
      notesId
    );

    const notes = {
      ...originalObject["notes"][index],
      ...payload,
      updatedAt: moment().utc().format(),
    };

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      originalObject?.id,
      employee.sub,
      EmployeeCompanyInteractionsModel.tableName,
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
    await validateDeleteNotes({ employeeId: employee.sub, companyId, notesId });
    const key = "notes";
    const { originalObject, index } = await validateJSONItemAndGetIndex(
      this.docClient.getKnexClient(),
      EmployeeCompanyInteractionsModel.tableName,
      { companyId, employeeId: employee.sub },
      key,
      notesId
    );

    await updateHistoryHelper(
      PendingApprovalType.UPDATE,
      originalObject.id,
      employee.sub,
      EmployeeCompanyInteractionsModel.tableName,
      this.docClient.getKnexClient(),
      { [key]: null },
      PendingApprovalType.JSON_DELETE,
      notesId
    );

    return { notes: originalObject[key][index] };
  }

  getSelectKeys(returningFields) {
    const companyKeys = sanitizeColumnNames(
      CompanyModel.columnNames,
      returningFields,
      "c"
    );

    const employeeToCompanyKeys = sanitizeColumnNames(
      EmployeeCompanyInteractionsModel.validSchemaKeys,
      returningFields,
      "ec",
      true
    );

    const teamToCompanyKeys = sanitizeColumnNames(
      TeamCompanyInteractionsModel.validSchemaKeys,
      returningFields,
      "tc",
      true
    );

    const companyArray = Array.isArray(companyKeys)
      ? companyKeys
      : [companyKeys];
    const teamToCompanyArray = Array.isArray(teamToCompanyKeys)
      ? teamToCompanyKeys
      : [teamToCompanyKeys];
    const employeeToCompanyArray = Array.isArray(employeeToCompanyKeys)
      ? employeeToCompanyKeys
      : [employeeToCompanyKeys];

    return [...companyArray, ...teamToCompanyArray, ...employeeToCompanyArray];
  }

  validateCompanyWithInteractions(companyItem) {
    return {
      ...companyItem,
      priority: companyItem?.priority ?? COMPANY_PRIORITY.NO_PRIORITY,
      status: companyItem?.status ?? COMPANY_STATUS.NONE,
      // stage: companyItem?.stage ?? COMPANY_STAGES.LEAD,
      notes: companyItem?.notes ?? [],
      employeeInteractionDetails: companyItem?.employeeInteractionDetails ?? {},
      stage: companyItem?.stage ?? COMPANY_STAGES.LEAD,
      teamInteractionDetails: companyItem?.teamInteractionDetails ?? {},
    };
  }
}

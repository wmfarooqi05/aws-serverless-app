import "reflect-metadata";
import CompanyModel, {
  ICompanyModel,
  ICompanyPaginated,
} from "@models/Company";
import {
  ICompany,
  INotes,
  COMPANY_PRIORITY,
  COMPANY_STATUS,
  COMPANY_STAGES,
  ICompanyWithRelations,
} from "@models/interfaces/Company";
import { DatabaseService } from "@libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateUpdateCompanyAssignedEmployee,
  validateGetCompanies,
  validateUpdateCompanies,
  validateCreateCompany,
  validateGetNotes,
  validateAddNotes,
  validateUpdateNotes,
  validateDeleteNotes,
  validateUpdateCompaniesAssignedEmployee,
  validateUpdateCompanyInteractions,
  validateUploadOrReplaceAvatar,
} from "./schema";

import { inject, singleton } from "tsyringe";
import ActivityModel from "@models/Activity";
import { randomUUID } from "crypto";
import { CustomError } from "src/helpers/custom-error";
import {
  convertToWhereInValue,
  validateJSONItemAndGetIndex,
  updateHistoryHelper,
} from "src/common/json_helpers";
import {
  IPendingApprovals,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
import { IEmployee, IEmployeeJwt } from "@models/interfaces/Employees";
import { getOrderByItems, getPaginateClauseObject } from "@common/query";
import { EmployeeService } from "@functions/employees/service";
import Joi from "joi";
import {
  EMPLOYEE_COMPANY_INTERACTIONS_TABLE,
  TEAM_COMPANY_INTERACTIONS_TABLE,
} from "@models/commons";
import EmployeeCompanyInteractionsModel, {
  IEmployeeCompanyInteraction,
  defaultInteractionItem,
  getDefaultEmployeeInteractionItem,
} from "@models/EmployeeCompanyInteractions";
import TeamCompanyInteractionsModel, {
  ITeamCompanyInteraction,
  getDefaultTeamInteractionItem,
} from "@models/TeamCompanyInteractions";
import { IWithPagination } from "knex-paginate";
import EmployeeModel from "@models/Employees";
import { S3Service } from "@common/service/S3Service";
import TeamModel, { ITeam } from "@models/Teams";
import { getSelectKeys, validateCompanyWithInteractions } from "./utils";

const defaultTimezone = "Canada/Eastern";

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

@singleton()
export class CompanyService implements ICompanyService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
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
    const returningKeys = getSelectKeys(returningFields);

    const companies: IWithPagination<ICompany> = await knex(
      `${CompanyModel.tableName} as c`
    )
      .leftJoin(`${EMPLOYEE_COMPANY_INTERACTIONS_TABLE} as ec`, (join) => {
        join.on("ec.employee_id", "=", knex.raw("?", [employee.sub])); // Use parameter binding
        join.on("ec.company_id", "=", "c.id");
      })
      .leftJoin(`${TEAM_COMPANY_INTERACTIONS_TABLE} as tc`, (join) => {
        // @TODO FIX_TEAM_ID
        join.on("tc.team_id", "=", knex.raw("?", [employee.currentTeamId]));
        join.on("tc.company_id", "=", "c.id");
      })
      .select("c.id")
      .where(whereClause)
      .modify((builder) => {
        if (status) {
          builder.whereRaw(`ec.status IN (${convertToWhereInValue(status)})`);
        }
        if (priority) {
          builder.whereRaw(
            `ec.priority = (${convertToWhereInValue(priority)})`
          );
        }
        if (stage) {
          builder.whereRaw(`tc.stage IN (${convertToWhereInValue(stage)})`);
        }
      })
      .groupBy("c.id")
      .orderBy(...getOrderByItems(body, "c"))
      .paginate(getPaginateClauseObject(body));

    let companiesWithContacts = [];
    if (companies.data.length) {
      companiesWithContacts = await CompanyModel.query()
        .findByIds([...new Set(companies.data.map((x) => x.id))])
        .withGraphFetched(
          "[contacts, teamInteractions(filterByMyTeamModifier), employeeInteractions(filterByMyIdModifier)]"
        )
        .modifiers({
          filterByMyTeamModifier: (query) =>
            query.modify("filterByMyTeam", employee.currentTeamId),
          filterByMyIdModifier: (query) =>
            query.modify("filterByMyId", employee.sub),
        })
        .returning(returningKeys);
    }

    return {
      data: companiesWithContacts,
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

  async getContactsByCompanyForEmailList(employee: IEmployee, body) {
    const { page = 1, pageSize = 500 } = body;
    return CompanyModel.query()
      .select(["id", "companyName", "avatar"])
      .page(page - 1, pageSize)
      .withGraphFetched("contacts(shortForm)")
      .modifiers({
        shortForm(builder) {
          builder.select(["id", "name", "avatar", "emails"]);
        },
      });
  }

  async createCompany(
    employee: IEmployeeJwt,
    body: any
  ): Promise<{ company?: CompanyModel; pendingApproval?: IPendingApprovals }> {
    const payload = JSON.parse(body);
    payload.createdBy = employee.sub;
    await validateCreateCompany(payload);

    if (!payload.timezone) {
      payload.timezone = defaultTimezone;
    }

    const contactsPayload = payload.contacts;
    delete payload.contacts;

    // remove the pending approval thing maybe
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
    let error = null;
    // @TODO we dont need this transaction
    await this.docClient.getKnexClient().transaction(async (trx) => {
      try {
        company = await CompanyModel.query(trx).insertGraph({
          ...payload,
          contacts: contactsPayload.map((x) => ({
            ...x,
            createdBy: employee.sub,
          })),
          teamInteractions: employee.teamId.map(
            (t) =>
              ({
                stage: COMPANY_STAGES.LEAD,
                teamId: t,
                teamInteractionDetails: {},
              } as ITeamCompanyInteraction)
          ),
          employeeInteractions: [
            {
              ...defaultInteractionItem,
              employeeId: employee.sub,
            } as IEmployeeCompanyInteraction,
          ],
        });
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

    return company;
  }

  async updateCompany(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<{ company?: CompanyModel; pendingApproval?: IPendingApprovals }> {
    const payload = JSON.parse(body);
    await validateUpdateCompanies(id, payload);

    // Update and store current version in history table

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
      company: validateCompanyWithInteractions({
        ...company,
        ...payload,
      }),
    };
  }

  async convertCompany(employee: IEmployeeJwt, companyId: string) {
    const company: ICompanyWithRelations = await CompanyModel.query()
      .findById(companyId)
      .withGraphFetched("teamInteractions(filterByMyTeamModifier).[team]")
      .modifiers({
        filterByMyTeamModifier: (query) =>
          query.modify("filterByMyTeam", employee.currentTeamId),
      });

    if (!company) {
      throw new CustomError("Company not found", 404);
    }

    const teamCompanyInteraction: ITeamCompanyInteraction | null =
      company.teamInteractions?.[0] || null;

    if (teamCompanyInteraction?.stage === COMPANY_STAGES.CONTACT) {
      throw new CustomError("Company is already converted to contact", 400);
    }

    const team: ITeam =
      teamCompanyInteraction?.team ??
      (await TeamModel.query().findById(employee.currentTeamId));
    if (!team) {
      throw new CustomError(
        `Team ${employee.currentTeamId} doesn't exists`,
        400
      );
    }

    const id = teamCompanyInteraction?.id ?? null;
    const action = teamCompanyInteraction?.id
      ? PendingApprovalType.UPDATE
      : PendingApprovalType.CREATE;

    const payload =
      action === PendingApprovalType.CREATE
        ? {
            ...getDefaultTeamInteractionItem(employee, companyId),
            stage: COMPANY_STAGES.CONTACT,
          }
        : { stage: COMPANY_STAGES.CONTACT };

    // Update and store current version in history table

    await updateHistoryHelper(
      action,
      id,
      employee.sub,
      TeamCompanyInteractionsModel.tableName,
      this.docClient.getKnexClient(),
      payload
    );

    return {
      ...company,
      teamInteractions: teamCompanyInteraction
        ? [
            {
              ...teamCompanyInteraction,
              ...payload,
            },
          ]
        : [{ ...payload, team }],
    };
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

    // Delete and store current version in history table
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

    // Update and store current version in history table
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

    // Update and store current version in history table
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

  /*** Notes are personal items, so no validations */
  // Notes
  async getNotes(employee: IEmployeeJwt, companyId: any) {
    await validateGetNotes(employee.sub, companyId);
    const employeeRecord: IEmployee = await EmployeeModel.query().findById(
      employee.sub
    );
    const interactionItem: IEmployeeCompanyInteraction = await this.docClient
      .getKnexClient()(EmployeeCompanyInteractionsModel.tableName)
      .select(["notes"])
      .where({ companyId, employeeId: employee.sub })
      .first();
    return (
      interactionItem?.notes
        .sort(
          (a: INotes, b: INotes) =>
            Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
        )
        .map((x) => {
          return {
            ...x,
            ownerName: employeeRecord.name,
          };
        }) ?? []
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

  async uploadOrReplaceAvatar(
    employee: IEmployeeJwt,
    companyId: string,
    body: string
  ) {
    const payload = JSON.parse(body);
    await validateUploadOrReplaceAvatar(employee.sub, companyId, payload);
    /**
     * We have determined that this is new url
     * Now we have to upload it to S3 and create record
     * of file permissions. Then also add a job for image
     * processing.
     */

    const companyRecord: ICompanyWithRelations = await CompanyModel.query()
      .findById(companyId)
      .withGraphFetched("companyAvatar.[variations]")
      .select(["id", "companyName"]);

    // implementation removed
    // return this.fileRecordService.avatarUploadHelper()
  }
}

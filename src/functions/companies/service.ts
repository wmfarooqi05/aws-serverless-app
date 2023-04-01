import "reflect-metadata";
import CompanyModel, {
  defaultCompanyDetails,
  ICompanyModel,
  ICompanyPaginated,
} from "@models/Company";
import {
  IAssignmentHistory,
  IConcernedPerson,
  ICompany,
  COMPANY_STAGES,
  INotes,
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
} from "./schema";

import { inject, injectable } from "tsyringe";
import ActivityModel from "@models/Activity";
import { randomUUID } from "crypto";
import { CustomError } from "src/helpers/custom-error";
import {
  addJsonbObjectHelper,
  convertToWhereInValue,
  deleteJsonbObjectHelper,
  transformJSONKeys,
  updateJsonbObjectHelper,
  validateJSONItemAndGetIndex,
} from "src/common/json_helpers";
import {
  APPROVAL_ACTION_JSONB_PAYLOAD,
  APPROVAL_ACTION_SIMPLE_KEY,
  IOnApprovalActionRequired,
  PendingApprovalType,
} from "@models/interfaces/PendingApprovals";
import { IEmployee, IEmployeeJwt, roleKey } from "@models/interfaces/Employees";
import { RolesEnum } from "@models/interfaces/Employees";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import {
  COMPANIES_TABLE_NAME,
  getGlobalPermission,
  ModuleTitles,
} from "@models/commons";
import {
  getOrderByItems,
  getPaginateClauseObject,
  sanitizeColumnNames,
} from "@common/query";
import { EmployeeService } from "@functions/employees/service";
import Joi from "joi";

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

const tableSchema = CompanyModel.jsonSchema.properties;
const tableName = CompanyModel.tableName;

@injectable()
export class CompanyService implements ICompanyService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService,
    @inject(EmployeeService) private readonly employeeService: EmployeeService
  ) {}

  async getAllCompanies(body: any): Promise<ICompanyPaginated> {
    await validateGetCompanies(body);
    const { priority, status, stage, returningFields } = body;

    const whereClause: any = {};
    if (stage) whereClause.stage = stage;

    return this.docClient
      .getKnexClient()(CompanyModel.tableName)
      .select(sanitizeColumnNames(CompanyModel.columnNames, returningFields))
      .where(whereClause)
      .where((builder) => {
        if (status) {
          builder.whereRaw(
            `details->>'status' IN (${convertToWhereInValue(status)})`
          );
        }
        if (priority) {
          builder.whereRaw(
            `details->>'priority' = (${convertToWhereInValue(priority)})`
          );
        }
      })
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async getCompaniesByEmployeeId(
    user: IEmployeeJwt,
    employeeId: string,
    body: any
  ): Promise<ICompanyPaginated> {
    await validateGetCompanies(body);
    await this.employeeService.validateRequestByEmployeeRole(user, employeeId);
    const { priority, status, stage, returningFields } = body;

    // @TODO remove me
    const whereClause: any = {
      assignedTo: employeeId === "me" ? user.sub : employeeId,
    };
    if (stage) whereClause.stage = stage;

    return this.docClient
      .getKnexClient()(CompanyModel.tableName)
      .select(sanitizeColumnNames(CompanyModel.columnNames, returningFields))
      .where(whereClause)
      .where((builder) => {
        if (status) {
          builder.whereRaw(
            `details->>'status' IN (${convertToWhereInValue(status)})`
          );
        }
        if (priority) {
          builder.whereRaw(
            `details->>'priority' IN (${convertToWhereInValue(priority)})`
          );
        }
      })
      .orderBy(...getOrderByItems(body))
      .paginate(getPaginateClauseObject(body));
  }

  async getCompany(id: string): Promise<ICompanyModel> {
    const company = await CompanyModel.query().findById(id);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }
    const activities = await ActivityModel.query().where({
      companyId: id,
    });
    company["activities"] = activities;
    return company;
  }

  async createCompany(employeeId: string, body: any): Promise<ICompanyModel> {
    const payload = JSON.parse(body);
    payload.createdBy = employeeId;
    await validateCreateCompany(payload);
    if (payload.stage === COMPANY_STAGES.LEAD) {
      payload.details = JSON.stringify({
        status: payload?.status ?? defaultCompanyDetails.status,
        priority: payload?.priority ?? defaultCompanyDetails.priority,
      });
      delete payload.status;
      delete payload.priority;
    }

    const timeNow = moment().utc().format();
    payload.concernedPersons = payload.concernedPersons?.map((x: any) => {
      return {
        ...x,
        id: randomUUID(),
        createdAt: timeNow,
        updatedAt: timeNow,
      } as IConcernedPerson;
    });

    const company = await CompanyModel.query().insert(payload).returning("*");
    return company;
  }

  async updateCompany(
    employee: IEmployeeJwt,
    id: string,
    body: any
  ): Promise<any> {
    const payload = JSON.parse(body);
    await validateUpdateCompanies(id, payload);
    // if (
    //   RolesEnum[employee["cognito:groups"][0]] === RolesEnum.SALES_REP_GROUP
    // ) {
    //   const item = await this.pendingApprovalService.createPendingApproval(
    //     employee.sub,
    //     id,
    //     ModuleTitles.COMPANY,
    //     COMPANIES_TABLE_NAME,
    //     PendingApprovalType.UPDATE,
    //     payload
    //   );
    //   return item;
    // } else {
    // const updatedCompany = await CompanyModel.query().findById(id);
    // if (!updatedCompany || Object.keys(updatedCompany).length === 0) {
    //   throw new CustomError("Object not found", 404);
    // }

    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      id,
      employee.sub,
      payload
    );

    const company = await CompanyModel.query().findById(id);
    return { company };
  }

  async deleteCompany(employee: IEmployeeJwt, id: string): Promise<any> {
    // if (
    //   RolesEnum[employee["cognito:groups"][0]] === RolesEnum.SALES_REP_GROUP
    // ) {
    //   const item = await this.pendingApprovalService.createPendingApproval(
    //     employee.sub,
    //     id,
    //     ModuleTitles.COMPANY,
    //     COMPANIES_TABLE_NAME,
    //     PendingApprovalType.DELETE
    //   );
    //   return item;
    // } else {
    // const deleted = await CompanyModel.query().deleteById(id);
    await this.updateHistoryHelper(
      PendingApprovalType.DELETE,
      id,
      employee.sub
    );

    return { company: { id } };
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

    const { assignTo } = payload;

    const company = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }
    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      { assignedTo: assignTo ?? CompanyModel.raw("NULL") }
    );

    return { company: { ...company, assignedTo: assignTo ?? null } };
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
    const permission: boolean = getGlobalPermission(
      "company.childModules.concernedPersons",
      "create"
    );
    if (
      !permission &&
      RolesEnum[employee["cognito:groups"][0]] === RolesEnum.SALES_REP_GROUP
    ) {
      const company = await CompanyModel.query().findById(companyId);
      if (!company) {
        throw new CustomError("Company not found", 404);
      }
      // or employee is manager, determine if this manager is allowed to see data
      const jsonbPayload: APPROVAL_ACTION_JSONB_PAYLOAD = {
        objectType: "JSONB",
        payload: {
          jsonbItemValue: payload,
          jsonbItemKey: "concernedPersons",
          jsonActionType: PendingApprovalType.JSON_PUSH,
        },
      };

      const item = await this.pendingApprovalService.createPendingApproval(
        employee.sub,
        companyId,
        ModuleTitles.COMPANY,
        COMPANIES_TABLE_NAME,
        PendingApprovalType.JSON_PUSH,
        [jsonbPayload]
      );
      return { pendingApproval: item };
    }

    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      { concernedPersons: payload },
      PendingApprovalType.JSON_PUSH,
      null
    );

    return { concernedPersons: payload };
  }

  async updateConcernedPerson(
    companyId: string,
    concernedPersonId: string,
    employeeId: string,
    body
  ) {
    /**
     * Exclude this logic to a middleware
     */

    const payload = JSON.parse(body);
    await validateUpdateConcernedPerson(
      employeeId,
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
    };
    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employeeId,
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

    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
      { [key]: null },
      PendingApprovalType.JSON_DELETE,
      concernedPersonId
    );

    return { concernedPersons: originalObject[key][index] };
  }

  // Notes
  async getNotes(employeeId: string, companyId: any) {
    await validateGetNotes(employeeId, companyId);
    const notes = await this.docClient
      .getKnexClient()(CompanyModel.tableName)
      .select(["notes"])
      .where({ id: companyId })
      .first();
    return notes.notes;
  }

  // Notes
  async createNotes(addedBy: string, companyId: string, body: any) {
    const payload = JSON.parse(body);
    if (payload) {
      await validateAddNotes(addedBy, companyId, payload);
    }
    const notes: INotes = {
      id: randomUUID(),
      addedBy,
      isEdited: false,
      notesText: payload.notesText,
      updatedAt: moment().utc().format(),
    };

    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      addedBy,
      { notes },
      PendingApprovalType.JSON_PUSH,
      null
    );

    return { notes };
  }

  async updateNotes(addedBy: string, companyId: string, notesId: string, body) {
    const payload = JSON.parse(body);
    await validateUpdateNotes(addedBy, companyId, notesId, payload);

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
    };
    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      addedBy,
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

    await this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      companyId,
      employee.sub,
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

  convertPayloadToArray = (
    actionType: PendingApprovalType,
    tableRowId: string,
    payload: object,
    jsonActionType: string = null,
    jsonbItemId: string = null
  ) => {
    interface PayloadType {
      tableRowId: string;
      tableName: string;
      onApprovalActionRequired: IOnApprovalActionRequired;
    }
    const approvalActions: IOnApprovalActionRequired = {
      actionType,
      actionsRequired: [],
    };

    if (actionType === PendingApprovalType.DELETE) {
      approvalActions.actionsRequired.push({
        objectType: "SIMPLE_KEY",
        payload: null,
      });
    } else {
      Object.keys(payload).forEach((key) => {
        let objectType = this.getObjectType(key);
        if (objectType === "SIMPLE_KEY") {
          let value = payload[key];
          if (typeof value === "object") {
            value = JSON.stringify(value);
          }
          approvalActions.actionsRequired.push({
            objectType,
            payload: { [key]: value },
          });
        } else {
          approvalActions.actionsRequired.push({
            objectType,
            payload: {
              jsonbItemId,
              jsonActionType,
              jsonbItemKey: key,
              jsonbItemValue: payload[key],
            },
          });
        }
      });
    }
    return {
      tableName,
      tableRowId,
      onApprovalActionRequired: approvalActions,
    } as PayloadType;
  };

  async updateHistoryHelper(
    actionType: PendingApprovalType,
    tableRowId: string,
    updatedBy,
    payload: object = null,
    jsonActionType: string = null,
    jsonbItemId: string = null
  ) {
    const {
      onApprovalActionRequired: { actionsRequired },
    } = this.convertPayloadToArray(
      actionType,
      tableRowId,
      payload,
      jsonActionType,
      jsonbItemId
    );
    const knexClient = this.docClient.getKnexClient();
    const originalObject = await knexClient(tableName)
      .where({ id: tableRowId })
      .first();
    if (!originalObject) {
      throw new CustomError(
        `Object not found in table: ${tableName}, id: ${tableRowId}`,
        400
      );
    }

    const finalQueries: any[] = transformJSONKeys(
      tableRowId,
      actionsRequired,
      actionType,
      originalObject,
      knexClient,
      tableName,
      updatedBy
    );

    // Executing all queries as a single transaction
    const responses = await knexClient.transaction(async (trx) => {
      const updatePromises = finalQueries.map((finalQuery) =>
        trx.raw(finalQuery.toString())
      );
      return Promise.all(updatePromises);
    });

    return responses;
  }

  getObjectType(key) {
    type OBJECT_KEY_TYPE = "SIMPLE_KEY" | "JSON";
    const map: Record<string, OBJECT_KEY_TYPE> = {
      companyName: "SIMPLE_KEY",
      concernedPersons: "JSON",
      addresses: "SIMPLE_KEY",
      assignedTo: "SIMPLE_KEY",
      assignedBy: "SIMPLE_KEY",
      priority: "SIMPLE_KEY",
      status: "SIMPLE_KEY",
      details: "SIMPLE_KEY",
      stage: "SIMPLE_KEY",
      tags: "SIMPLE_KEY",
      notes: "JSON",
      tableRowId: "SIMPLE_KEY",
      tableName: "SIMPLE_KEY",
    };

    return map[key];
  }
}

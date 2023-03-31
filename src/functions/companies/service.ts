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

    return CompanyModel.query().insert(payload).returning("*");
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

    return this.updateHistoryHelper(
      PendingApprovalType.UPDATE,
      id,
      payload,
      employee.sub
    );
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
    const deleted = await CompanyModel.query().deleteById(id);

    if (!deleted) {
      throw new CustomError("Company not found", 404);
    }
    // }
  }
  async updateCompanyAssignedEmployee(companyId, assignedBy, body) {
    // @TODO: @Auth this employee should be the manager of changing person
    // @Paul No need for pending approval [Check with Paul]
    await validateUpdateCompanyAssignedEmployee(
      companyId,
      assignedBy,
      JSON.parse(body)
    );

    const { assignTo, comments } = JSON.parse(body);

    const company = await CompanyModel.query().findById(companyId);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }

    // const update
    const assignmentHistory: IAssignmentHistory = {
      assignedTo: assignTo || null,
      assignedBy,
      comments: comments || "",
      date: moment().utc().format(),
    };

    const updateQuery = {
      ...addJsonbObjectHelper(
        "assignmentHistory",
        this.docClient.getKnexClient(),
        assignmentHistory
      ),
      assignedTo: assignTo ? assignTo : CompanyModel.raw("NULL"),
      assignedBy,
    };

    const updatedCompany = await CompanyModel.query().patchAndFetchById(
      companyId,
      updateQuery
    );

    if (!updatedCompany || Object.keys(updatedCompany).length === 0) {
      throw new CustomError("Object not found", 404);
    }

    return updatedCompany;
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
        key: "concernedPersons",
        jsonbItem: payload,
      };

      const item = await this.pendingApprovalService.createPendingApproval(
        employee.sub,
        companyId,
        ModuleTitles.COMPANY,
        COMPANIES_TABLE_NAME,
        PendingApprovalType.JSON_PUSH,
        jsonbPayload
      );
      return { pendingApproval: item };
    }
    const company = await CompanyModel.query()
      .patch(
        addJsonbObjectHelper(
          "concernedPersons",
          this.docClient.getKnexClient(),
          payload
        )
      )
      .where({ id: companyId })
      .returning("*")
      .first();

    if (!company) {
      throw new CustomError("Company does't exists", 404);
    }

    return { company };
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

    const company: ICompany = await CompanyModel.query().findById(companyId);

    if (!company) {
      throw new CustomError("Company doesn't exists.", 404);
    }

    // @TODO check if concernedPersons is null
    const index = company.concernedPersons.findIndex(
      (x) => x.id === concernedPersonId
    );

    if (index === -1) {
      throw new CustomError("Concerned Person doesn't exist", 404);
    }

    const updateQuery = updateJsonbObjectHelper(
      "concernedPersons",
      {
        ...company.concernedPersons[index],
        ...payload,
        updatedBy: employeeId,
        updatedAt: moment().utc().format(),
      },
      index,
      this.docClient.getKnexClient()
    );

    return CompanyModel.query().patchAndFetchById(companyId, updateQuery);
  }

  async deleteConcernedPerson(companyId: string, concernedPersonId: string) {
    // @ADD some query to find index of id directly
    const company: ICompany = await CompanyModel.query().findOne({
      id: companyId,
    });

    if (!company) {
      throw new CustomError("Company doesn't exists", 404);
    }

    const index = company?.concernedPersons?.findIndex(
      (x) => x.id === concernedPersonId
    );

    if (index === -1) {
      throw new CustomError("Concerned Person doesn't exist", 404);
    }

    const deleteQuery = deleteJsonbObjectHelper(
      "concernedPersons",
      index,
      this.docClient.getKnexClient()
    );

    return CompanyModel.query().patchAndFetchById(companyId, deleteQuery);
  }

  // Notes
  async getNotes(employeeId: string, companyId: any) {
    await validateGetNotes(employeeId, companyId);
    return this.docClient
      .getKnexClient()(CompanyModel.tableName)
      .select(["id", "notes"])
      .where({ id: companyId });
  }

  // Notes
  async createNotes(addedBy: string, companyId: string, body: any) {
    const payload = JSON.parse(body);
    if (payload) {
      await validateAddNotes(addedBy, companyId, payload);
    }
    const notesItem: INotes = {
      id: randomUUID(),
      addedBy,
      isEdited: false,
      notesText: payload.notesText,
      updatedAt: moment().utc().format(),
    };

    // @TODO we are adding [] by default, so maybe not need double check
    const company = await CompanyModel.query()
      .patch({
        notes: CompanyModel.raw(
          `
          CASE
            WHEN notes IS NULL THEN :arr::JSONB
            ELSE notes || :obj::JSONB
          END
          `,
          {
            obj: JSON.stringify(notesItem),
            arr: JSON.stringify([notesItem]),
          }
        ),
      })
      .where({ id: companyId })
      .returning("*")
      .first();

    if (!company) {
      throw new CustomError("Company does't exists", 404);
    }

    return company;
  }

  async updateNotes(addedBy: string, companyId: string, notesId: string, body) {
    const payload = JSON.parse(body);
    await validateUpdateNotes(addedBy, companyId, notesId, payload);

    const company: ICompany = await CompanyModel.query()
      .findById(companyId)
      .returning(["notes"]);

    if (!company) {
      throw new CustomError("Company doesn't exists.", 404);
    }

    // @TODO check if concernedPersons is null
    const index = company?.notes?.findIndex((x) => x.id === notesId);

    if (index === -1 || index === undefined) {
      throw new CustomError("Notes doesn't exist", 404);
    }

    if (company.notes[index].addedBy !== addedBy) {
      throw new CustomError("Only creator can modify his notes", 403);
    }

    const date = moment().utc().format();
    const updatedNotes: INotes = {
      ...company.notes[index],
      notesText: payload.notesText,
      updatedAt: date,
      isEdited: true,
    };

    return CompanyModel.query().patchAndFetchById(companyId, {
      notes: ActivityModel.raw(
        `
          jsonb_set(notes, 
            '{
              ${index}
            }', '${JSON.stringify(updatedNotes)}', 
            true
          )
        `
      ),
    });
  }

  async deleteNotes(companyId: string, notesId: string) {
    // @ADD some query to find index of id directly
    const company: ICompany = await CompanyModel.query()
      .findOne({
        id: companyId,
      })
      .returning(["notes"]);

    const index = company?.notes?.findIndex((x) => x.id === notesId);

    if (index === -1 || index === undefined) {
      throw new CustomError("Company doesn't exist", 404);
    }

    return CompanyModel.query().patchAndFetchById(companyId, {
      notes: ActivityModel.raw(`notes - ${index}`),
    });
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
    Object.keys(payload).forEach((key) => {
      let objectType = this.getObjectType(key);
      if (objectType === "SIMPLE_KEY") {
        approvalActions.actionsRequired.push({
          objectType,
          payload: { [key]: payload[key] },
        });
      } else {
        approvalActions.actionsRequired.push({
          objectType,
          payload: {
            jsonbItemId,
            jsonbItemKey: key,
            jsonbItemValue: payload[key],
          },
        });
      }
    });
    return {
      tableName,
      tableRowId,
      onApprovalActionRequired: approvalActions,
    } as PayloadType;
  };

  async updateHistoryHelper(
    actionType: PendingApprovalType,
    tableRowId: string,
    payload: object,
    updatedBy,
    jsonbItemId: string = null
  ) {
    const {
      onApprovalActionRequired: { actionsRequired },
    } = this.convertPayloadToArray(
      actionType,
      tableRowId,
      payload,
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
      tableRowId: "SIMPLE_KEY",
      tableName: "SIMPLE_KEY",
      approvers: "SIMPLE_KEY",
      createdBy: "SIMPLE_KEY",
      onApprovalActionRequired: "JSON",
      escalationTime: "SIMPLE_KEY",
      skipEscalation: "SIMPLE_KEY",
      status: "SIMPLE_KEY",
      retryCount: "SIMPLE_KEY",
      resultPayload: "SIMPLE_KEY",
    };

    return map[key];
  }
}

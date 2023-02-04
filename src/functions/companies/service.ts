import "reflect-metadata";
import CompanyModel, {
  IAddress,
  IAssignmentHistory,
  IConcernedPerson,
  ICompany,
  ICompanyModel,
  ICompanyPaginated,
} from "../../models/Company";
import { DatabaseService } from "../../libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateUpdateCompanyAssignedUser,
  validateGetCompanies,
  validateUpdateCompanies,
  validateCreateConcernedPerson,
  validateUpdateConcernedPerson,
  validateCreateCompany,
  validateGetNotes,
  validateAddNotes,
  validateUpdateNotes,
} from "./schema";

import { injectable, inject } from "tsyringe";
import ActivityModel from "src/models/Activity";
import { randomUUID } from "crypto";
import { CustomError } from "src/helpers/custom-error";
import {
  addJsonbObject,
  deleteJsonbObject,
  updateJsonbObject,
} from "src/common/json_helpers";
import {
  IOnApprovalActionRequired,
  IPendingApprovals,
  PendingApprovalsStatus,
  PendingApprovalType,
} from "src/models/interfaces/PendingApprovals";
import { IUserJwt } from "src/models/interfaces/User";
import { RolesEnum } from "src/models/User";
import { PendingApprovalService } from "@functions/pending_approvals/service";
import { COMPANIES_TABLE_NAME } from "src/models/commons";

export interface ICompanyService {
  getAllCompanies(body: any): Promise<ICompanyPaginated>;
  createCompany(company: ICompanyModel): Promise<ICompanyModel>;
  getCompany(id: string): Promise<ICompanyModel>;
  updateCompany(id: string, status: string): Promise<ICompanyModel>;
  deleteCompany(user: IUserJwt, id: string): Promise<any>;
}

@injectable()
export class CompanyService implements ICompanyService {
  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService,
    @inject(PendingApprovalService)
    private readonly pendingApprovalService: PendingApprovalService
  ) {}

  async getAllCompanies(body: any): Promise<ICompanyPaginated> {
    if (body) {
      await validateGetCompanies(body);
    }
    const { page, pageSize, returningFields } = body;
    return this.docClient
      .getKnexClient()(CompanyModel.tableName)
      .select(this.sanitizeCompaniesColumnNames(returningFields))
      .orderBy("createdAt")
      .paginate({
        perPage: pageSize ? parseInt(pageSize) : 12,
        currentPage: page ? parseInt(page) : 1,
      });
  }

  async getCompany(id: string): Promise<ICompanyModel> {
    const company = await CompanyModel.query().findById(id);
    if (!company) {
      throw new CustomError("Company not found", 404);
    }
    const activities = await ActivityModel.query().where({
      companyId: id,
    });
    company.activities = activities;
    return company;
  }

  async createCompany(body: any): Promise<ICompanyModel> {
    const payload = JSON.parse(body);
    await validateCreateCompany(payload);

    const timeNow = moment().format();
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

  async updateCompany(id: string, body: any): Promise<ICompanyModel> {
    const payload = JSON.parse(body);
    await validateUpdateCompanies(id, payload);

    const updatedCompany = await CompanyModel.query().patchAndFetchById(
      id,
      payload
    );
    if (!updatedCompany || Object.keys(updatedCompany).length === 0) {
      throw new CustomError("Object not found", 404);
    }

    return updatedCompany;
  }

  async deleteCompany(user: IUserJwt, id: string): Promise<any> {
    // @ADD some query to find index of id directly
    // const pendingApproval: IPendingApprovals; // Use pending approval service to add request
    if (user["cognito:groups"] === RolesEnum.SALES_REP) {
      const onApprovalActionRequired: IOnApprovalActionRequired = {
        rowId: id,
        tableName: COMPANIES_TABLE_NAME,
        actionType: PendingApprovalType.DELETE,
      };

      const activityId = `DELETE_COMPANY-${randomUUID()}`;
      const item: IPendingApprovals = {
        activityId,
        activityName: activityId,
        approvers: [],
        createdBy: user.sub,
        onApprovalActionRequired,
        status: PendingApprovalsStatus.PENDING,
      };

      await this.pendingApprovalService.createPendingApproval(item);
    } else {
      const deleted = await CompanyModel.query().deleteById(id);

      if (!deleted) {
        throw new CustomError("Company not found", 404);
      }
    }
  }
  async updateCompanyAssignedUser(companyId, assignedBy, body) {
    await validateUpdateCompanyAssignedUser(
      companyId,
      assignedBy,
      JSON.parse(body)
    );

    const { assignTo, comments } = JSON.parse(body);

    // const update
    const assignmentHistory: IAssignmentHistory = {
      assignedTo: assignTo || null,
      assignedBy,
      comments: comments || "",
      date: moment().format(),
    };

    const updatedCompany = await CompanyModel.query().patchAndFetchById(
      companyId,
      {
        assignedTo: assignTo ? assignTo : CompanyModel.raw("NULL"),
        assignedBy,
        assignmentHistory: CompanyModel.raw(
          `(
            CASE
              WHEN assignment_history IS NULL THEN :assignmentWithArray::JSONB
              ELSE assignment_history || :assignmentWithoutArray::jsonb
            END
          )`,
          {
            assignmentWithArray: JSON.stringify([assignmentHistory]),
            assignmentWithoutArray: JSON.stringify(assignmentHistory),
          }
        ),
      }
    );

    if (!updatedCompany || Object.keys(updatedCompany).length === 0) {
      throw new CustomError("Object not found", 404);
    }

    return updatedCompany;
  }

  async createConcernedPersons(companyId, employeeId, body) {
    const payload = JSON.parse(body);
    await validateCreateConcernedPerson(companyId, employeeId, payload);

    const date = moment().format();

    payload["id"] = randomUUID();
    payload["addedBy"] = employeeId;
    payload["updatedBy"] = employeeId;
    payload["createdAt"] = date;
    payload["updatedAt"] = date;

    const company = await CompanyModel.query()
      .patch(
        addJsonbObject("concernedPersons", this.docClient.knexClient, payload)
      )
      .where({ id: companyId })
      .returning("*")
      .first();

    if (!company) {
      throw new CustomError("Company does't exists", 404);
    }

    return company;
  }

  async updateConcernedPerson(
    companyId: string,
    concernedPersonId: string,
    employeeId: string,
    body
  ) {
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

    const updateQuery = updateJsonbObject(
      "concernedPersons",
      this.docClient.knexClient,
      {
        ...company.concernedPersons[index],
        ...payload,
        updatedBy: employeeId,
        updatedAt: moment().format(),
      },
      index
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

    const deleteQuery = deleteJsonbObject(
      "concernedPersons",
      this.docClient.knexClient,
      index
    );

    return CompanyModel.query().patchAndFetchById(companyId, deleteQuery);
  }

  // Notes
  async getNotes(userId: string, companyId: any) {
    await validateGetNotes(userId, companyId);
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
      updatedAt: moment().format(),
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

    const date = moment().format();
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

  // Helper
  sanitizeCompaniesColumnNames(fields: string): string | string[] {
    if (!fields) return "*";
    const columnNames = Object.keys(CompanyModel.jsonSchema.properties);
    const returningFields = fields
      .split(",")
      .filter((x) => columnNames.includes(x));

    if (returningFields.length === 0) {
      return "*";
    }
    return returningFields;
  }
}

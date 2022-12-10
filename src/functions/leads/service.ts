import "reflect-metadata";
import LeadModel, {
  IAssignmentHistory,
  ILead,
  ILeadModel,
  ILeadPaginated,
  LEADS_TABLE_NAME,
} from "../../models/Lead";
import { DatabaseService } from "../../libs/database/database-service-objection";
import moment from "moment-timezone";

import {
  validateUpdateLeadAssignedUser,
  validateGetLeads,
  validateUpdateLeads,
  validateCreateConcernedPerson,
  validateUpdateConcernedPerson,
} from "./schema";

import { injectable, inject } from "tsyringe";
import ConversationModel from "src/models/Conversation";
import { randomUUID } from "crypto";

export interface ILeadService {
  getAllLeads(body: any): Promise<ILeadPaginated>;
  createLead(lead: ILeadModel): Promise<ILeadModel>;
  getLead(id: string): Promise<ILeadModel>;
  updateLead(id: string, status: string): Promise<ILeadModel>;
  deleteLead(id: string): Promise<any>;
}

@injectable()
export class LeadService implements ILeadService {
  // @TODO make use of this
  private Tablename: string = LEADS_TABLE_NAME;

  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllLeads(body: any): Promise<ILeadPaginated> {
    if (body) {
      await validateGetLeads(body);
    }
    const { page, pageSize } = body;
    return this.docClient
      .getKnexClient()(LeadModel.tableName)
      .paginate({
        perPage: pageSize ? parseInt(pageSize) : 12,
        currentPage: page ? parseInt(page) : 1,
      });
  }

  async getLead(id: string): Promise<ILeadModel> {
    const lead = await LeadModel.query().findById(id);
    const conversations = await ConversationModel.query().where({ leadId: id });
    lead.converations = conversations;
    return lead;
  }

  async createLead(body: any): Promise<ILeadModel> {
    const payload = JSON.parse(body);
    // validateCreateLead(payload);

    return LeadModel.query().insert(payload).returning("*");
  }

  async updateLead(body: any): Promise<ILeadModel> {
    const payload = JSON.parse(body);
    await validateUpdateLeads(payload);
    const id = payload.id;
    delete payload.id;

    const updatedLead = await LeadModel.query().patchAndFetchById(id, payload);
    if (!updatedLead || Object.keys(updatedLead).length === 0) {
      throw Error("Object not found");
    }

    return updatedLead;
  }

  async updateLeadAssignedUser(assignedBy, body) {
    await validateUpdateLeadAssignedUser(assignedBy, JSON.parse(body));

    const { assignTo, leadId, comments } = JSON.parse(body);

    // const update
    const assignmentHistory: IAssignmentHistory = {
      assignedTo: assignTo || null,
      assignedBy,
      comments: comments || "",
      date: moment().format(),
    };

    const updatedLead = await LeadModel.query().patchAndFetchById(leadId, {
      assignedTo: assignTo ? assignTo : LeadModel.raw("NULL"),
      assignedBy,
      assignmentHistory: LeadModel.raw(
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
    });

    if (!updatedLead || Object.keys(updatedLead).length === 0) {
      throw Error("Object not found");
    }

    return updatedLead;
  }

  async createConcernedPersons(employeeId, body) {
    const payload = JSON.parse(body);
    await validateCreateConcernedPerson(employeeId, payload);
    const leadId = payload.leadId;
    delete payload.leadId;

    const date = moment().format();

    payload["id"] = randomUUID();
    payload["addedBy"] = employeeId;
    payload["updatedBy"] = employeeId;
    payload["createdAt"] = date;
    payload["updatedAt"] = date;

    const lead = LeadModel.query()
      .patch({
        concernedPersons: LeadModel.raw(
          `
          CASE
            WHEN concerned_persons IS NULL THEN :arr::JSONB
            ELSE concerned_persons || :obj::JSONB
          END
          `,
          {
            obj: JSON.stringify(payload),
            arr: JSON.stringify([payload]),
          }
        ),
      })
      .where({ id: leadId })
      .returning("*")
      .first();

    if (!lead) {
      throw new Error("Lead does't exists");
    }

    return lead;
  }

  async updateConcernedPerson(id, employeeId, body) {
    const payload = JSON.parse(body);
    await validateUpdateConcernedPerson(employeeId, payload);
    const { leadId } = payload;
    delete payload.leadId;

    const lead: ILead = await LeadModel.query().findOne({
      id: leadId,
    });

    const index = lead.concernedPersons.findIndex((x) => x.id === id);

    if (index === -1) {
      throw new Error("Concerned Person doesn't exist");
    }

    const date = moment().format();
    const updatedPerson = {
      ...lead.concernedPersons[index],
      ...payload,
      updatedBy: employeeId,
      updatedAt: date,
    };

    return LeadModel.query().patchAndFetchById(leadId, {
      concerned_persons: ConversationModel.raw(
        `
          jsonb_set(concerned_persons, 
            '{
              ${index}
            }', '${JSON.stringify(updatedPerson)}', 
            true
          )
        `
      ),
    });
  }
}

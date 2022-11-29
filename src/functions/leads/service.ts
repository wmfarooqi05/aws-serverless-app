import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { DatabaseService } from "../../libs/database-service";
import * as moment from "moment-timezone";
moment.tz.setDefault("Canada/Eastern");

import { Lead } from "./model";
import {
  validateUpdateLeadAssignedUser,
  validateGetLeads,
  validateUpdateLeads,
} from "./schema";

export interface ILeadService {
  getAllLeads(body: any): Promise<Lead[]>;
  createLead(lead: Lead): Promise<Lead>;
  getLead(id: string): Promise<Lead>;
  updateLead(id: string, status: string): Promise<Lead>;
  deleteLead(id: string): Promise<any>;
}

@injectable()
export class LeadService implements ILeadService {
  private Tablename: string = process.env.LEAD_TABLE;

  constructor(
    @inject(DatabaseService) private readonly docClient: DatabaseService
  ) {}

  async getAllLeads(body: any): Promise<Lead[]> {
    await validateGetLeads(body);
    const { page, pageSize } = body;
    let defaultPageSize = parseInt(pageSize) ? parseInt(pageSize) : 20;

    // @TODO Add pagination
    let query = `
      SELECT * FROM leads 
      ORDER BY id DESC
      LIMIT ${defaultPageSize}
    `;

    if (page && parseInt(page) > 0) {
      query += `OFFSET ${(page - 1) * defaultPageSize}`;
    }

    const leads = await this.docClient.runQuery(query);
    return leads.rows; // as Lead[];
  }

  async getLead(id: string): Promise<Lead> {
    const query = `SELECT * FROM leads where id='${id}'`;
    const leads = await this.docClient.runQuery(query);
    return leads.rows; // as Lead[];
  }

  async createLead(body: any): Promise<Lead> {
    const {
      company_name,
      phone_number,
      address,
      city,
      country,
      postal_code,
      concerned_persons,
      remarks,
    } = JSON.parse(body);
    // const payload = JSON.parse(body);
    // @TODO Add type checks
    const lead: Lead = {
      company_name,
      phone_number,
      address,
      city,
      country,
      postal_code,
      concerned_persons,
      remarks,
    };

    const fields = [];
    const values = [];
    if (company_name) {
      fields.push("company_name");
      values.push(company_name);
    }
    if (phone_number) {
      fields.push("phone_number");
      values.push(phone_number);
    }
    if (address) {
      fields.push("address");
      values.push(address);
    }
    if (city) {
      fields.push("city");
      values.push(city);
    }
    if (country) {
      fields.push("country");
      values.push(country);
    }
    if (postal_code) {
      fields.push("postal_code");
      values.push(postal_code);
    }
    if (concerned_persons) {
      fields.push("concerned_persons");
      values.push(JSON.stringify(concerned_persons));
    }
    if (remarks) {
      fields.push("remarks");
      values.push(JSON.stringify(remarks));
    }

    const query = this.getCreateQuery("leads", fields, "*");
    const leadCreated = await this.docClient.runQuery(query, values);

    return leadCreated?.rows[0];
  }

  async updateLead(body: any): Promise<Lead> {
    const payload = JSON.parse(body);
    await validateUpdateLeads(payload);
    const id = payload.id;
    delete payload.id;

    const query = this.getUpdateQuery("leads", id, Object.keys(payload), "*");
    const args = Object.values(payload);
    const updatedLead = await this.docClient.runQuery(query, args);
    return updatedLead?.rows[0];
  }

  // async deleteLead(id: string): Promise<any> {
  //   return await this.docClient
  //     .getDocumentClient()
  //     .delete({
  //       TableName: this.Tablename,
  //       Key: {
  //         id,
  //       },
  //     })
  //     .promise();
  // }

  async updateLeadAssignedUser(assignedBy, body) {
    await validateUpdateLeadAssignedUser(assignedBy, JSON.parse(body));

    const { assignTo, leadId, comments } = JSON.parse(body);

    const assignmentHistory = {
      assignedTo: assignTo || null,
      assignedBy,
      comments: comments || "",
      date: Date.now(),
    };

    const query = `
      UPDATE leads \n SET 
      assigned_to = $1,
      assigned_by = $2,
      assignment_history = (
        CASE
            WHEN assignment_history IS NULL THEN '[]'::JSONB
            ELSE assignment_history
        END
      ) || $3::JSONB WHERE id = $4
      RETURNING "id", "assigned_to", "assigned_by", "assignment_history"
    `;

    const updatedLead = await this.docClient.runQuery(query, [
      assignTo,
      assignedBy,
      assignmentHistory,
      leadId,
    ]);
    return updatedLead?.rows[0];
  }

  // @TODO move to utils
  getCreateQuery(
    tableName: string,
    fields: string[],
    returningValues: string
  ): string {
    return `INSERT INTO ${tableName} 
    (${fields}) VALUES(${fields
      .map((_: string, i: number) => `$${i + 1}`)
      .join(",")}) RETURNING ${returningValues}`;
  }

  getUpdateQuery(
    tableName: string,
    id: string,
    fields: string[],
    returningValues: string = "*"
  ): string {
    let query = `UPDATE ${tableName} \n SET `;
    fields.forEach((x, i) => {
      query += `${x} = $${i + 1},\n`;
    });
    query = query.replace(/,\s*$/, "");
    query += `\nWHERE id='${id}' \n RETURNING ${returningValues}`;

    return query;
  }

  async processLeads(): Promise<any> {}

}

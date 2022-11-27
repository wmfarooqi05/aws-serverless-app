import "reflect-metadata";
// import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { injectable, inject } from "tsyringe";
import { DatabaseService } from "../../libs/database-service";

import { Lead } from "./model";

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
  ) { }

  async getAllLeads(body: any): Promise<Lead[]> {
    // const { page, total } = body;

    // @TODO Add pagination
    const query = `SELECT * FROM leads`;
    console.log('query', query);
    const leads = await this.docClient.runQuery(query);
    console.log('leads', leads);
    return leads.rows;// as Lead[];
  }

  async getLead(id: string): Promise<Lead> {
    console.log('getLead id=', id);
    const query = `SELECT * FROM leads where id='${id}'`;
    console.log('query');
    const leads = await this.docClient.runQuery(query);
    console.log('leads', leads);
    return leads.rows;// as Lead[];
  }

  async createLead(body: any): Promise<Lead> {
    const { company_name, phone_number, address, city, country, postal_code, concerned_persons, remarks } = JSON.parse(body);
    const now = new Date();
    const endAt = new Date();
    endAt.setHours(now.getHours() + 10);

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
      fields.push('company_name')
      values.push(company_name);
    }
    if (phone_number) {
      fields.push('phone_number');
      values.push(phone_number);
    }
    if (address) {
      fields.push('address');
      values.push(address);
    }
    if (city) {
      fields.push('city')
      values.push(city);
    }
    if (country) {
      fields.push('country')
      values.push(country);
    }
    if (postal_code) {
      fields.push('postal_code')
      values.push(postal_code);
    }
    if (concerned_persons) {
      fields.push('concerned_persons');
      values.push(JSON.stringify(concerned_persons));
    }
    if (remarks) {
      fields.push('remarks');
      values.push(JSON.stringify(remarks));
    }

    // const leadCreated = await this.docClient.runQuery('INSERT INTO leads (id, company_name) VALUES($1, $2) RETURNING id', [lead.id, lead.company_name]);

    const query =
      `INSERT INTO leads 
      (${fields}) VALUES(${fields.map((_, i) => `$${i + 1}`).join(',')
      }) RETURNING *`;
    const leadCreated = await this.docClient.runQuery(query, values);

    return leadCreated?.rows[0];
  }

  async updateLead(id: string, status: string): Promise<Lead> {
    const updated = await this.docClient
      .getDocumentClient()
      .update({
        TableName: this.Tablename,
        Key: { id },
        UpdateExpression: "set #status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": status,
        },
        ReturnValues: "ALL_NEW",
      })
      .promise();

    return updated.Attributes as Lead;
  }

  async deleteLead(id: string): Promise<any> {
    return await this.docClient
      .getDocumentClient()
      .delete({
        TableName: this.Tablename,
        Key: {
          id,
        },
      })
      .promise();
  }

  async processLeads(): Promise<any> { }
}

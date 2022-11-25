import "reflect-metadata";
// import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { injectable, inject } from "tsyringe";
import { v4 as uuid } from "uuid";
import { lead } from "..";
import { DatabaseService } from "../../libs/database-service";

import { Lead, STATUS } from "./model";

export interface ILeadService {
  getAllLeads(): Promise<Lead[]>;
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

  async getAllLeads(): Promise<Lead[]> {
    const leads = await this.docClient
      .getDocumentClient()
      .scan({
        TableName: this.Tablename,
      })
      .promise();
    return leads.Items as Lead[];
  }

  async createLead(body: any): Promise<Lead> {
    const { title, description } = JSON.parse(body);
    const now = new Date();
    const endAt = new Date();
    endAt.setHours(now.getHours() + 10);

    const lead: Lead = {
      id: uuid(),
      title,
      description,
      status: STATUS.OPEN,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      endAt: endAt.toISOString(),
    };

    const params = {
      TableName: this.Tablename,
      Item: lead,
    };

    const leadCreated = await this.docClient.runQuery('INSERT INTO leads (uuid, name) VALUES($1, $2) RETURNING id', [lead.id, lead.title]);
    // await this.docClient.getDocumentClient().put(params).promise();

    return leadCreated;
  }

  async getLead(id: string): Promise<Lead> {
    console.log(id);
    const lead = await this.docClient
      .getDocumentClient()
      .get({
        TableName: this.Tablename,
        Key: {
          id,
        },
      })
      .promise();
    if (!lead.Item) {
      throw new Error("Id does not exit");
    }
    return lead.Item as Lead;
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

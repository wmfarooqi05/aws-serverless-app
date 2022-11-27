import { fluentProvide } from "inversify-binding-decorators";
// import { v4 } from 'uuid';
import { Client } from 'pg';

export default interface IConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

@fluentProvide(DatabaseService)
  .inSingletonScope()
  .done()
export class DatabaseService {
  documentClient: Client | null = null;
  // documentClient: AWS.DynamoDB.DocumentClient | null = null;

  constructor() {
    console.log('process.env.LEAD_TABLE', process.env.LEAD_TABLE);
    this.initializeClient();
  }

  private async initializeClient() {
    var client = new Client({
      // host: process.env.POSTGRESQL_HOST,
      // port: process.env.POSTGRESQL_PORT,
      // database: process.env.DB_NAME,
      // user: process.env.USERNAME,
      // password: process.env.PASSWORD
      host: 'geldbtest.cyb3arxab5e4.ca-central-1.rds.amazonaws.com',
      database: 'geldbtest',
      user: 'postgres',
      password: 'postgres_qasid123',
    });

    this.documentClient = client;
  }

  public getDocumentClient() {
    if (!this.documentClient) {
      this.initializeClient();
    }
    return this.documentClient!;
  }

  public async runQuery(queryString = '', params = []) {
    if (!this.documentClient) {
      this.initializeClient();
    }
    let result = null;
    try {
      await this.documentClient.connect();
      result = await this.documentClient.query(queryString, params);
    } finally {
      await this.documentClient.end();
    }

    return result
  }
}

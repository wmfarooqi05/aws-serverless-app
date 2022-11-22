import * as AWS from "aws-sdk";
import { fluentProvide } from "inversify-binding-decorators";

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
  documentClient: AWS.DynamoDB.DocumentClient | null = null;

  constructor() {
    console.log('process.env.AUCTION_TABLE', process.env.AUCTION_TABLE);
    this.initializeClient();
  }

  private initializeClient() {
    this.documentClient = new AWS.DynamoDB.DocumentClient();
  }

  public getDocumentClient() {
    if (!this.documentClient) {
      this.initializeClient();
    }
    return this.documentClient!;
  }
}

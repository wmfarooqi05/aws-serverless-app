import "reflect-metadata";
import {
  injectable,
  // injectable
} from "tsyringe";
// import { RedisClientType } from "redis";
import * as redis from "redis";
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  GetItemCommand,
  DeleteItemCommandInput,
  PutItemCommandOutput,
  GetItemCommandOutput,
  DeleteItemCommandOutput,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { ICache } from "./CacheService";

// @TODO replace this with main dynamo service
// right now keeping this class as it is 
export interface IDynamoCacheService extends ICache {}

@injectable()
export class DynamoCacheService implements IDynamoCacheService {
  client: DynamoDBClient;
  // isReady: boolean;
  constructor() {
    // this.initializeClient();
  }

  async initializeClient() {
    try {
      if (this.client) return;
      this.client = new DynamoDBClient({
        region: process.env.REGION,
      });
    } catch (e) {
      console.error("[DynamoService] error", e);
    }
  }

  async putKey(tableName, key, value): Promise<PutItemCommandOutput> {
    try {
      console.log("putkey: ", tableName, key, value);
      await this.initializeClient();
      const command: PutItemCommand = new PutItemCommand({
        TableName: tableName,
        Item: {
          employeeId: {
            S: key,
          },
          data: {
            S: value,
          },
        },
      });

      console.log("putKey: command", command);
      return this.client.send(command);
    } catch (e) {
      console.error("[DynamoService] error", e);
    }
  }

  async getItem(
    TableName,
    partitionKeyName,
    keyValue
  ): Promise<GetItemCommandOutput> {
    try {
      console.log("getItem: ", TableName, partitionKeyName, keyValue);
      await this.initializeClient();

      const command: GetItemCommand = new GetItemCommand({
        TableName,
        Key: this.getKeyValuePair(partitionKeyName, keyValue),
      });
      console.log("[DynamoService] getItem: command", command.input);
      const tempClient = new DynamoDBClient({
        region: process.env.REGION,
      });
      console.log('tempClient', tempClient);
      const item = await tempClient.send(command);
      console.log('[DynamoService] item', item);
      return item;
    } catch (e) {
      console.error("[DynamoService] error", e);
    }
  }

  async deleteKey(TableName, key, value): Promise<DeleteItemCommandOutput> {
    try {
      console.log("deleteKey: ", TableName, key, value);
      await this.initializeClient();

      const input: DeleteItemCommandInput = {
        TableName,
        Key: {
          [key]: {
            S: value,
          },
        },
      };

      const command: DeleteItemCommand = new DeleteItemCommand(input);
      console.log("deleteKey: command", command);

      return this.client.send(command);
    } catch (e) {
      console.error("[DynamoService] error", e);
    }
  }

  async scanTable(TableName): Promise<ScanCommandOutput> {
    try {
      await this.initializeClient();

      const command: ScanCommand = new ScanCommand({
        TableName,
      });
      return this.client.send(command);
    } catch (e) {
      console.error("[DynamoService] error", e);
    }
  }

  private getKeyValuePair = (partitionKeyName, keyValue) => {
    return { [partitionKeyName]: { S: keyValue } };
  };
}

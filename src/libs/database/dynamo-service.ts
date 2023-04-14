import "reflect-metadata";
import {
  injectable,
  // injectable
} from "tsyringe";
// import { RedisClientType } from "redis";
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  PutItemCommandInput,
  DeleteItemCommandInput,
  ScanCommandInput,
  GetItemCommandInput,
} from "@aws-sdk/client-dynamodb";

export interface IDynamoService {}

@injectable()
export class DynamoService implements IDynamoService {
  client: DynamoDBClient;
  // isReady: boolean;
  constructor() {
    this.initializeClient();
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

  /**
   * Insert Item
   * @param TableName
   * @param partitionKeyValue
   * @param sortKeyValue
   * @param item
   * @returns
   */
  async putItem(
    TableName: string,
    partitionKeyValue,
    sortKeyValue,
    item: object
  ) {
    const params: PutItemCommandInput = {
      TableName,
      Item: {
        partitionKey: { S: partitionKeyValue },
        ...item,
      },
    };
    if (sortKeyValue) {
      params.Item.sortKey = { S: sortKeyValue };
    }

    try {
      return this.client.send(new PutItemCommand(params));
    } catch (err) {
      return this.getError(err);
    }
  }

  /**
   *
   * @param TableName
   * @param sortKeyName
   * @param ProjectionExpression attributes we want to return 'name, email'
   * @returns
   */
  async scanDb(
    TableName: string,
    sortKeyValue: string = null,
    AttributesToGet: string[] = []
  ) {
    try {
      const input: ScanCommandInput = {
        TableName,
        AttributesToGet,
      };

      if (sortKeyValue) {
        input.FilterExpression = "sortKey = :sortKeyValue";
        input.ExpressionAttributeValues = {
          ":sortKeyValue": { S: sortKeyValue },
        };
      }

      const command: ScanCommand = new ScanCommand(input);
      return this.client.send(command);
    } catch (err) {
      return this.getError(err);
    }
  }

  /**
   *
   * @param tableName
   * @param partitionKeyValue
   * @param sortKeyValue
   * @returns
   */
  async getItemByKeys(tableName, partitionKeyValue, sortKeyValue) {
    try {
      const params: GetItemCommandInput = {
        TableName: tableName,
        Key: {
          partitionKey: { S: partitionKeyValue }, // Specify the partition key value
        },
      };

      if (sortKeyValue) {
        // If sort key value is provided, add it to the Key object
        params.Key.sortKey = { S: sortKeyValue }; // Specify the sort key value
      }

      return await this.client.send(new ScanCommand(params));
    } catch (err) {
      return this.getError(err);
    }
  }

  deleteItemByKeys = async (tableName, partitionKeyValue, sortKeyValue) => {
    const params: DeleteItemCommandInput = {
      TableName: tableName,
      Key: {
        partitionKey: { S: partitionKeyValue }, // Specify the partition key value
      },
    };

    if (sortKeyValue) {
      // If sort key value is provided, add it to the Key object
      params.Key.sortKey = { S: sortKeyValue }; // Specify the sort key value
    }

    try {
      return this.client.send(new DeleteItemCommand(params));
    } catch (err) {
      return this.getError(err);
    }
  };

  getError(error) {
    const { requestId, httpStatusCode } = error.$metadata;
    console.log({ requestId, httpStatusCode });
    return {
      status: "Error",
      details: {
        statusName: error.name,
        statusMessage: error.specialKeyInException,
        statusCode: httpStatusCode,
      },
    };
  }
}

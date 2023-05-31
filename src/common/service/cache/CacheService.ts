import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { DynamoCacheService } from "./DynamoCacheService";
import { ElasticCacheService } from "./ElasticCache";
import moment from "moment-timezone";
import WebsocketConnectionModel, {
  IWebsocketConnection,
} from "@models/dynamoose/WebsocketConnections";
import { CONNECTION_STATUS } from "@models/dynamoose/WebsocketConnections";

export interface ICache {
  initializeClient: () => Promise<void>;
}

export interface ICacheService {}

@injectable()
export class CacheService implements ICacheService {
  // isReady: boolean;
  useElasticCache = false;
  tableName: string = process.env.ConnectionTableName;
  partitionKeyName: string = process.env.ConnectionTablePartitionKey;

  // evantually we will remove dynamoDb.
  // also, this cache can also be used for values other than connections
  // so we will need to modify in future
  constructor(
    // @inject(DynamoCacheService) private readonly dynamoService: DynamoCacheService,
    @inject(ElasticCacheService)
    private readonly elasticCache: ElasticCacheService
  ) {
    // this.initiateConnection();
  }

  async initiateConnection() {
    if (this.useElasticCache) {
      await this.elasticCache.initializeClient();
    } else {
      // await this.dynamoService.initializeClient();
    }
  }

  async storeKey(employeeId: string, connectionId: string) {
    if (this.useElasticCache) {
      console.log("storing in elastic cache", employeeId, connectionId);
      await this.elasticCache.setValueToRedis(
        employeeId,
        JSON.stringify({
          connectionId,
          employeeId,
          time: moment().utc().format(),
        })
      );
    } else {
      const connectionItem = new WebsocketConnectionModel({
        employeeId,
        connectionId,
        connectedAt: moment.utc().format(),
        connectionStatus: "CONNECTED",
      } as IWebsocketConnection);
      try {
        await connectionItem.save();
      } catch (e) {
        // No need apparently
        if (e.code === "ConditionalCheckFailedException") {
          const item = await WebsocketConnectionModel.get({ employeeId });
          item.connectionStatus = "CONNECTED" as CONNECTION_STATUS;
          await item.save();
        }
      }
    }
  }

  async getItem(employeeId: string): Promise<string> {
    if (this.useElasticCache) {
      return this.elasticCache.getValueFromRedis(employeeId);
    } else {
      const connectionItem: IWebsocketConnection =
        await WebsocketConnectionModel.get({ employeeId });
      return JSON.stringify(connectionItem);
    }
  }

  async deleteItem(connectionId: string) {
    if (this.useElasticCache) {
      // this is actually employeeId, not connectionId
      await this.elasticCache.removeValueFromRedis(connectionId);
    } else {
      const item = await WebsocketConnectionModel.query("connectionId")
        .eq(connectionId)
        .exec();
      if (item.length > 0) {
        // Delete the item
        item[0].connectionStatus = "DISCONNECTED";
        await item[0].save();
        console.log("Item updated successfully.");
      } else {
        console.log("Item not found with the provided connectionId.");
      }
    }
  }

  async updateConnectionStatus(
    connectionId: string,
    connectionStatus: CONNECTION_STATUS
  ) {
    const item = await WebsocketConnectionModel.query("connectionId")
      .eq(connectionId)
      .exec();
    if (item.length > 0) {
      // Delete the item
      item[0].connectionStatus = connectionStatus;
      await item[0].save();
      console.log("Item updated successfully.");
    } else {
      console.log("Item not found with the provided connectionId.");
    }
  }

  async getAllItems() {
    if (this.useElasticCache) {
      return this.elasticCache.getAllValues();
    } else {
      return WebsocketConnectionModel.scan().exec();
    }
  }
}

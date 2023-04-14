import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { DynamoCacheService } from "./DynamoCacheService";
import { ElasticCacheService } from "./ElasticCache";
import moment from "moment-timezone";

export interface ICache {
  initializeClient: () => Promise<void>;
}

export interface ICacheService {}

@injectable()
export class CacheService implements ICacheService {
  // isReady: boolean;
  useElasticCache = true;
  tableName: string = process.env.ConnectionTableName;
  partitionKeyName: string = process.env.ConnectionTablePartitionKey;

  // evantually we will remove dynamoDb.
  // also, this cache can also be used for values other than connections
  // so we will need to modify in future
  constructor(
    @inject(DynamoCacheService) private readonly dynamoService: DynamoCacheService,
    @inject(ElasticCacheService)
    private readonly elasticCache: ElasticCacheService
  ) {
    // this.initiateConnection();
  }

  async initiateConnection() {
    if (this.useElasticCache) {
      await this.elasticCache.initializeClient();
    } else {
      await this.dynamoService.initializeClient();
    }
  }

  async storeKey(employeeId: string, connectionId: string) {
    if (this.useElasticCache) {
      console.log("storing in elastic cache", employeeId, connectionId)
      await this.elasticCache.setValueToRedis(
        employeeId,
        JSON.stringify({
          connectionId,
          employeeId,
          time: moment().utc().format(),
        })
      );
    } else {
      this.dynamoService.putKey(
        this.tableName,
        employeeId,
        JSON.stringify(connectionId)
      );
    }
  }

  async getItem(employeeId: string): Promise<string> {
    if (this.useElasticCache) {
      return this.elasticCache.getValueFromRedis(employeeId);
    } else {
      const object = await this.dynamoService.getItem(
        this.tableName,
        this.partitionKeyName,
        employeeId
      );
      return JSON.stringify(object.Item?.data?.S);
    }
  }

  async deleteItem(employeeId: string) {
    if (this.useElasticCache) {
      await this.elasticCache.removeValueFromRedis(employeeId);
    } else {
      await this.dynamoService.deleteKey(
        this.tableName,
        this.partitionKeyName,
        employeeId
      );
    }
  }

  async getAllItems() {
    if (this.useElasticCache) {
      return this.elasticCache.getAllValues();
    } else {
      return this.dynamoService.scanTable(this.tableName);
    }
  }
}

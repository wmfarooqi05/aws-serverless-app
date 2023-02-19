import "reflect-metadata";
import {
  injectable,
  // injectable
} from "tsyringe";
import { RedisClientType } from "redis";
import * as redis from "redis";

export interface IElasticCacheService {}

@injectable()
export class ElasticCacheService implements IElasticCacheService {
  client: RedisClientType | null;
  isReady: boolean;
  constructor() {
    // this.initializeClient();
  }

  async initializeClient() {
    if (!this.client) {
      const config: redis.RedisClientOptions = {
        url: "http://localhost:6379",
        // ...cacheOption
      };
      this.client = redis.createClient(config);
      this.client.on('error', err => console.error(`Redis Error: ${err}`))
      this.client.on('connect', () => console.info('Redis connected'))
      this.client.on('reconnecting', () => console.info('Redis reconnecting'))
      this.client.on('ready', () => {
        this.isReady = true
        console.info('Redis ready!')
      });
      await this.client.connect();
      // this.client.on("connect", this.handleOnConnect);
      // this.client.set("key", "value", this.handleOnSetValue);
      // this.client.get("key", this.handleOnGetValue);
    }
  }

  async setValueToRedis(key: string, value: any) {
    return this.client.set(key, value);
  }

  async getValueFromRedis(key: string) {
    if (!this.client) { await this.initializeClient(); }
    return this.client.get(key);
  }
}

import "reflect-metadata";
import {
  injectable,
  // injectable
} from "tsyringe";
// import { RedisClientType } from "redis";
import * as redis from "redis";
import { ICache } from "./CacheService";

export interface IElasticCacheService extends ICache {}

@injectable()
export class ElasticCacheService implements IElasticCacheService {
  client: redis.RedisClientType;
  // connecting = false;
  // isReady: boolean;
  constructor() {}

  async connect() {
    if (!this.client) {
      await this.initializeClient();
    }
  }

  async initializeClient() {
    try {
      if (this.client?.isReady) return;
      if (process.env.STAGE === "local") {
        this.client = redis.createClient();
      } else {
        this.client = redis.createClient({
          url: process.env.ELASTIC_CACHE_SERVER,
        });
      }
      this.client.on("error", (err) => console.error(`Redis Error: ${err}`));
      this.client.on("connect", () => console.info("Redis connected"));
      this.client.on("reconnecting", () => console.info("Redis reconnecting"));
      this.client.on("ready", () => {
        // this.isReady = true;
        console.info("Redis ready!");
      });
      await this.client.connect();
    } catch (e) {
      console.log("error", e);
    }
  }

  async disconnect() {
    this.client.disconnect();
    // this.isReady = false;
  }

  async setValueToRedis(key: string, value: string) {
    try {
      await this.initializeClient();
      await this.client.set(key, value);
      console.log(`key: ${key} saved in redis, value: `, value);
    } catch (e) {
      console.log("error redis", e);
    }
  }

  async removeValueFromRedis(key: string) {
    await this.initializeClient();
    await this.client.del(key);
    console.log(`key: ${key} removed from redis`);
  }

  async getValueFromRedis(key: string) {
    console.log("[ElasticCacheService]: getValueFromRedis", key);
    await this.initializeClient();
    console.log("[ElasticCacheService]: getValueFromRedis, client initialized");
    return this.client.get(key);
  }

  /** @TODO @WARNING @DEV */
  async getAllValues() {
    await this.initializeClient();
    const keys = await this.client.keys("*");
    const allVals = [];
    for (let i = 0; i < keys.length; i++) {
      const item = await this.client.get(keys[i]);
      allVals.push({ [keys[i]]: JSON.parse(item) });
    }
    // const values = await this.client.hGetAll(keys);
    // return values;
    // const keys = await this.client.keys(['*']);
    // const values = await this.client.collection.mget(keys);
    // const vals = keys.map((_x, index) => {
    //   return {
    //     _x: values[index],
    //   };
    // });
    return allVals;
  }
}

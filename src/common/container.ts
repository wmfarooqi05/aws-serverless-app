import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
// import { ElasticCacheService } from "./service/ElasticCache";
import { container as tsyringeContainer } from "tsyringe";

const container = tsyringeContainer;
console.log("tsyringeContainer");
container.registerSingleton("DatabaseService", DatabaseService);
// container.registerInstance("ElasticCacheService", ElasticCacheService);
export { container };

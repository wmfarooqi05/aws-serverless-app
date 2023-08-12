import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
// import { ElasticCacheService } from "./service/ElasticCache";
import { container as tsyringeContainer } from "tsyringe";

const container = tsyringeContainer;
container.registerSingleton("DatabaseService", DatabaseService);
export { container };

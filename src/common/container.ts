import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
// import { ElasticCacheService } from "./service/ElasticCache";
import { container } from "tsyringe";

container.registerInstance("DatabaseService", DatabaseService);
// container.registerInstance("ElasticCacheService", ElasticCacheService);
export { container };

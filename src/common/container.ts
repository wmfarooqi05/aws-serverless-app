import "reflect-metadata";
import { DatabaseService } from "@libs/database/database-service-objection";
// import { ElasticCacheService } from "./service/ElasticCache";
import { container } from "tsyringe";
// import { DynamoService } from "./service/DynamoService";

container.registerInstance("DatabaseService", DatabaseService);
// container.registerInstance("ElasticCacheService", ElasticCacheService);
// container.registerInstance("DynamoService", DynamoService);
export { container };

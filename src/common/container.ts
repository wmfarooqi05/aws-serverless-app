import "reflect-metadata";
import { DatabaseService } from "../libs/database-service";
import { container } from 'tsyringe';
// import { AuctionService } from "../functions/auction/service";

container.registerSingleton(DatabaseService);
// container.register("AuctionService", AuctionService);
// container.registerSingleton("IConfigManager", ConfigManager);
// container.registerSingleton("IAWSHelper", AWSHelper);
// container.registerSingleton("IDBHelper", DBHelper);
// container.register("ICreateUserUseCase", CreateUserUseCase)
// container.register("ISendConfirmationMailUseCase", SendConfirmationMailUseCase)
// container.register("UserController", UserController)

export const diContainer = container;
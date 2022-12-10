import { singleton } from "tsyringe";
import { Knex, knex } from "knex";
import { Model, knexSnakeCaseMappers } from "objection";
import { config as knexConfig } from './knexfile';
import { attachPaginate } from "knex-paginate";
// @TODO check if this works
attachPaginate();

export default interface IConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

@singleton()
export class DatabaseService {
  knexClient: Knex | null = null;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    const config: Knex.Config = {
      ...knexConfig[process.env.STAGE],
      ...knexSnakeCaseMappers(),
    };

    this.knexClient = knex(config);
    Model.knex(this.knexClient);
  }

  public getKnexClient() {
    if (!this.knexClient) {
      this.initializeClient();
    }

    return this.knexClient;
  }
}

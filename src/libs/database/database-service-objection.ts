import { injectable } from "tsyringe";
import { Knex, knex } from "knex";
import { Model, knexSnakeCaseMappers } from "objection";
import { config as knexConfig } from "../../../knex/knexfile";
import { attachPaginate } from "knex-paginate";
// @TODO check if this works
attachPaginate();

export default interface IConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

@injectable()
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
    // @TODO add some wrapper here, which saves logs after query
  }

  // @deprecated
  /**
   * Deprecated
   */
  public getKnexClient() {
    if (!this.knexClient) {
      this.initializeClient();
    }

    return this.knexClient;
  }

  public get(tableName: string): Knex.QueryBuilder {
    if (!this.knexClient) {
      this.initializeClient();
    }

    return this.knexClient(tableName);
  }
}

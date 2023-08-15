import { singleton } from "tsyringe";
import { Knex, knex } from "knex";
import { Model, knexSnakeCaseMappers } from "objection";
import { config as knexConfig } from "../../../knex/knexfile";
import { attachPaginate } from "knex-paginate";
// @TODO check if this works
attachPaginate();

@singleton()
export class DatabaseService {
  // @TODO make this private
  knexClient: Knex | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    if (!this.knexClient) {
      const config: Knex.Config = {
        ...knexConfig[process.env.STAGE],
        ...knexSnakeCaseMappers(),
      };

      this.knexClient = knex(config);
      Model.knex(this.knexClient);
    }
    // @TODO add some wrapper here, which saves logs after query
  }

  /**
   * Knex Client
   */
  public getKnexClient(): Knex {
    if (!this.knexClient) {
      this.initializeClient();
    }

    return this.knexClient;
  }

  /**
   *
   * @param tableName table of knex model
   * @returns knex table instance
   */
  public get(tableName: string): Knex.QueryBuilder {
    if (!this.knexClient) {
      this.initializeClient();
    }

    return this.knexClient(tableName);
  }
}

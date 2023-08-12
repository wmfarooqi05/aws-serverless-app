import { singleton } from "tsyringe";
import { Knex, knex } from "knex";
import { Model, knexSnakeCaseMappers } from "objection";
import { config as knexConfig } from "./knexfile";
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

  private async initializeClient() {
    const config: Knex.Config = {
      ...knexConfig[process.env.STAGE],
      ...knexSnakeCaseMappers(),
    };

    this.getKnexClient() = knex(config);
    Model.knex(this.getKnexClient());
    // @TODO add some wrapper here, which saves logs after query
  }

  /**
   * Knex Client
   */
  public getKnexClient(): Knex {
    if (!this.getKnexClient()) {
      this.initializeClient();
    }

    return this.getKnexClient();
  }

  /**
   *
   * @param tableName table of knex model
   * @returns knex table instance
   */
  public get(tableName: string): Knex.QueryBuilder {
    if (!this.getKnexClient()) {
      this.initializeClient();
    }

    return this.getKnexClient()(tableName);
  }
}

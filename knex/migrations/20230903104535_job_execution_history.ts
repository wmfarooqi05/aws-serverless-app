import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = Tables.jobExecutionHistory;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("job_id")
        .index()
        .references("id")
        .inTable(Tables.jobs)
        .onDelete("SET NULL")
        .notNullable();

      table.string("job_status").notNullable().defaultTo("PENDING");
      table.json("job_result");
      table
        .timestamp("execution_timestamp", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

      table.integer("retry_count").notNullable().defaultTo(0);
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

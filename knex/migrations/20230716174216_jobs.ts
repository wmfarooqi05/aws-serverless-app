import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = Tables.jobs;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("uploaded_by");

      table.jsonb("details").defaultTo({});
      table.string("job_type");
      table.jsonb("job_result").defaultTo({});
      table.string("job_status");

      table.integer("retry_count").defaultTo(0).notNullable();
      table.timestamp("last_execution_timestamp");
      table.uuid("last_executed_job_id");

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

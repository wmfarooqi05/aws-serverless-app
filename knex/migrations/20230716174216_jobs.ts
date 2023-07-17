import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
import { onInsertLambdaTrigger } from "../triggers/onInsertLambdaTrigger";

const tableName = Tables.jobs;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("uploaded_by")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .onDelete("SET NULL")
        .notNullable();

      table.jsonb("details").defaultTo({});
      table.string("job_type");
      table.jsonb("job_result").defaultTo({});
      table.string("job_status");

      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)))
    .then(() => knex.raw(onInsertLambdaTrigger()));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

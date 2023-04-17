import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";
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
        .notNullable()
      table.string("job_type").notNullable();
      table.jsonb("result");
      table.string("job_status").notNullable();
      table.jsonb("details");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

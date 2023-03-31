import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

const tableName = Tables.updateHistory;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("table_row_id");
      table.string("table_name");
      table.string("field").notNullable();
      table.string("value").notNullable();
      table.string("old_value").notNullable();
      table.string("new_value").notNullable();
      table.jsonb("approvers").defaultTo("[]");
      table
        .uuid("updated_by")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .notNullable();

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

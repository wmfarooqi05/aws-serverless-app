import { Knex } from "knex";
import { tableName } from "../tables";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName.appAuditLogs, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("action_type").notNullable();
    table.string("action_title");
    table.string("summary");

    table.string("table_name").notNullable();
    table.string("module_name");
    table.string("related_module_name");

    table
      .uuid("company_id")
      .index()
      .references("id")
      .inTable(tableName.companies)
      .onDelete("SET NULL");
    table.string("company_name");

    table
      .uuid("created_by_id")
      .notNullable()
      .index()
      .references("id")
      .inTable(tableName.users)
      .onDelete("SET NULL");
    table.string("created_by_name").notNullable();

    table.string("query_string").notNullable();
    table.uuid("table_row_id").notNullable();
    table.string("table_row_title");

    table.jsonb("input_values").notNullable();
    table.jsonb("filter_tags");
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName.appAuditLogs);
}

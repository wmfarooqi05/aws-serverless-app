import { Knex } from "knex";
import { tableName } from "..";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName.conversations, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("lead_id")
      .notNullable()
      .index()
      .references("id")
      .inTable(tableName.leads);
    table
      .uuid("employee_id")
      .notNullable()
      .index()
      .references("id")
      .inTable(tableName.users);
    table
      .uuid("reporting_manager_id")
      .index()
      .references("id")
      .inTable(tableName.users);
    table.string("phone_number");
    table.jsonb("remarks");
    table.jsonb("call_details");
    table.jsonb("email_details");
    table.jsonb("concerned_person_details");
    table
      .timestamp("created_at", { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: false })
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName.conversations);
}

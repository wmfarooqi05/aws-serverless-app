import { Knex } from "knex";
import { tableName } from "..";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName.leads, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("company_name").notNullable();
    table.string("phone_number");
    table.string("address");
    table.string("state");
    table.string("city");
    table.string("country");
    table.string("postal_code", 512).unique().notNullable();
    table.jsonb("concerned_persons").defaultTo([]);
    table.uuid("assigned_to").index().references("id").inTable(tableName.users);
    table.uuid("assigned_by").index().references("id").inTable(tableName.users);
    table.jsonb("assignment_history").defaultTo([]);
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
  await knex.schema.dropTable(tableName.leads);
}

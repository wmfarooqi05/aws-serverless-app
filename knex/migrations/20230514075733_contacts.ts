import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
const tableName = Tables.contacts;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("company_id")
        .references("id")
        .inTable(Tables.companies)
        .notNullable();

      table.string("name").notNullable();
      table.string("avatar");
      table.string("designation");
      table.jsonb("emails").defaultTo(JSON.stringify([]));
      table.jsonb("phone_numbers").defaultTo(JSON.stringify([]));
      table.jsonb("details").defaultTo(JSON.stringify({}));
      table.string("timezone");
      table
        .uuid("created_by")
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

import { Knex } from "knex";
import { tableName } from "..";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName.users, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email").notNullable();
    table.string("name").notNullable();
    table.string("enabled");
    table.string("job_title");
    table.string("role");
    table.string("address");
    table.string("city");
    table.string("state");
    table.string("country");
    table.date("birthdate");
    table.date("email_verified");
    table.date("phone_number_verified");
    table.date("phone_number");
    table.jsonb("settings");
    table.jsonb("social_profiles");
    table.string("user_status");
    table
      .uuid("reporting_manager")
      .index()
      .references("id")
      .inTable(tableName.users);
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
  await knex.schema.dropTable(tableName.users);
}

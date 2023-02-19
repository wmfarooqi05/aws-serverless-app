import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

export const UserRolesMigrate = [
  "SALES_REP",
  "SALES_MANAGER",
  "REGIONAL_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
]

const defaultDateFormat = "YYYY-MM-DD";
const tableName = Tables.users;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("picture");
    table.string("email").notNullable();
    table.string("name").notNullable();
    table.string("enabled");
    table.string("job_title");
    table.enum("role", UserRolesMigrate).defaultTo(UserRolesMigrate[0]);
    table.jsonb("addresses").defaultTo([]);
    table.date("birthdate");
    table.date("email_verified");
    table.date("phone_number_verified");
    table.date("phone_number");
    table.jsonb("settings");
    table.jsonb("social_profiles");
    table.string("timezone");
    // we will store it in elastic cache
    // table.string("websocket_id");
    table.string("date_format").defaultTo(defaultDateFormat);
    table
      .uuid("added_by")
      .index()
      .references("id")
      .inTable(tableName)
      .onDelete('SET NULL');
    table.string("user_status");
    table
      .uuid("reporting_manager")
      .index()
      .references("id")
      .inTable(tableName);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

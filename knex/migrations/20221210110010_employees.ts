import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

export const EmployeeRolesMigrate = [
    "SALES_REP_GROUP",
    "SALES_MANAGER_GROUP",
    "REGIONAL_MANAGER_GROUP",
    "ADMIN_GROUP",
    "SUPER_ADMIN_GROUP",
  ];

const tableName = Tables.employees;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("picture");
    table.string("email").notNullable();
    table.string("name").notNullable();
    table.string("enabled");
    table.string("job_title");
    table.enum("role", EmployeeRolesMigrate).defaultTo(EmployeeRolesMigrate[0]);
    table.jsonb("addresses").defaultTo([]);
    table.date("birthdate");
    table.date("email_verified");
    table.date("phone_number_verified");
    table.date("phone_number");
    table.jsonb("settings");
    table.jsonb("social_profiles");
    table.string("timezone");
    // we will store it in elastic cache
    table.string("websocket_id");
    table.string("team_id").notNullable().defaultTo("team0").index();
    table
      .uuid("added_by")
      .index()
      .references("id")
      .inTable(tableName)
      .onDelete('SET NULL');
    table.string("employee_status");
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

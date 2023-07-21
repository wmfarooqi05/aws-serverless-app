import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
import { GenderArray, RolesArray } from "../../src/models/interfaces/Employees";

export const EmployeeRolesMigrate = [
  "SALES_REP",
  "SALES_MANAGER",
  "REGIONAL_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

const tableName = Tables.employees;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("username").unique().notNullable();
      table.string("email").unique().notNullable();
      table.string("name").notNullable();
      table.string("avatar");
      table.string("job_title").defaultTo(RolesArray[0]);
      table.boolean("enabled").defaultTo(true);
      table
        .enum("role", EmployeeRolesMigrate)
        .defaultTo(EmployeeRolesMigrate[0]);
      table.jsonb("addresses").defaultTo([]);
      table.date("birthdate");
      table.boolean("email_verified").defaultTo(false);
      table.boolean("phone_number_verified").defaultTo(false);
      table.string("phone_number");
      table.jsonb("settings").defaultTo({});
      table.jsonb("social_profiles").defaultTo({});
      table
        .string("timezone")
        .defaultTo(process.env.CANADA_DEFAULT_TIMEZONE || "America/Toronto");
      table.string("gender", 20).defaultTo(GenderArray[0]);
      table
        .uuid("added_by")
        .index()
        .references("id")
        .inTable(tableName)
        .onDelete("SET NULL");
      table.string("employee_status").defaultTo('ENABLED');
      table.jsonb("details").defaultTo(JSON.stringify({}));
      table.jsonb("secondary_phone_numbers").defaultTo([]);

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
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

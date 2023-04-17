import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";
const tableName = Tables.employeeCompanyInteraction;

export enum COMPANY_STAGES {
  LEAD = "LEAD",
  CONTACT = "CONTACT", // maybe contact or client
}

export enum COMPANY_STATUS {
  NONE = "NONE",
  ATTEMPTED_TO_CONTACT = "ATTEMPTED_TO_CONTACT",
  CONTACT_IN_FUTURE = "CONTACT_IN_FUTURE",
  CONTACTED = "CONTACTED",
  JUNK_LEAD = "JUNK_LEAD",
  LOST_LEAD = "LOST_LEAD",
  NOT_CONTACTED = "NOT_CONTACTED",
}

export enum COMPANY_PRIORITY {
  NO_PRIORITY = "NO_PRIORITY",
  LOWEST = "LOWEST",
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  HIGHEST = "HIGHEST",
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table
        .uuid("employee_id")
        .references("id")
        .inTable(Tables.employees)
        .notNullable();

      table
        .uuid("company_id")
        .references("id")
        .inTable(Tables.companies)
        .notNullable();

      table.jsonb("interaction_details").defaultTo(JSON.stringify({}));
      table
        .enum("stage", Object.values(COMPANY_STAGES))
        .defaultTo(COMPANY_STAGES.LEAD);
      table
        .enum("priority", Object.values(COMPANY_PRIORITY))
        .defaultTo(COMPANY_PRIORITY.NO_PRIORITY);
      table
        .enum("status", Object.values(COMPANY_STATUS))
        .defaultTo(COMPANY_STATUS.NONE);
      table.string("tags").defaultTo(""); // @TODO fix this
      table.jsonb("notes").defaultTo([]);

      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

      table.index(["company_id", "employee_id"])
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

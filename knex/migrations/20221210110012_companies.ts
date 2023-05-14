import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";


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
const tableName = Tables.companies;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("company_name").notNullable();
      table
        .uuid("created_by")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .onDelete("SET NULL")
        .notNullable();
      table
        .uuid("assigned_to")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .onDelete("SET NULL");
      table
        .uuid("assigned_by")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .onDelete("SET NULL");
      table.jsonb("addresses").defaultTo([]);
      table.jsonb("details").defaultTo(JSON.stringify({}));
      table.string("tags").defaultTo(""); // @TODO fix this

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

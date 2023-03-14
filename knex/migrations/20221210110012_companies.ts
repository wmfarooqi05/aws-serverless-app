import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

export enum COMPANY_STAGES {
  LEAD = "LEAD",
  PROSPECT = "PROSPECT",
  OPPORTUNITY = "OPPORTUNITY", // maybe contact or client
}

export enum TASK_STATUS {
  ICEBOX = "ICEBOX",
  BACK_LOG = "BACK_LOG",
  TO_DO = "TO_DO",
  DELAYED_BY_CLIENT = "DELAYED_BY_CLIENT",
  DELAYED_BY_MANAGER = "DELAYED_BY_MANAGER",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  BLOCKED = "BLOCKED",
  WONT_DO = "WONT_DO",
  NOT_VALID = "NOT_VALID", // @TODO improve
  DONE = "DONE",
}

// @TODO v2: Move this to a separate table
export enum PRIORITY {
  NO_PRIORITY = "NO_PRIORITY",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRUCIAL = "CRUCIAL",
}
const tableName = Tables.companies;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("company_name").notNullable();
    table.jsonb("concerned_persons").defaultTo([]);
    table
      .uuid("created_by")
      .index()
      .references("id")
      .inTable(Tables.users)
      .onDelete("SET NULL")
      .notNullable();
    table
      .uuid("assigned_to")
      .index()
      .references("id")
      .inTable(Tables.users)
      .onDelete("SET NULL");
    table
      .uuid("assigned_by")
      .index()
      .references("id")
      .inTable(Tables.users)
      .onDelete("SET NULL");
    table.jsonb("assignment_history").defaultTo([]);
    table.jsonb("addresses").defaultTo([]);
    table
      .enum("stage", Object.values(COMPANY_STAGES))
      .defaultTo(COMPANY_STAGES.LEAD);
    table
      .enum("priority", Object.values(PRIORITY))
      .defaultTo(PRIORITY.NO_PRIORITY);
    table
      .enum("task_status", Object.values(TASK_STATUS))
      .defaultTo(TASK_STATUS.ICEBOX);
    table.string("tags").defaultTo("");// @TODO fix this
    table.jsonb("notes").defaultTo([]);

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

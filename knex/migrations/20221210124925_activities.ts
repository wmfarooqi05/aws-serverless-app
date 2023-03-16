import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

export enum ACTIVITY_TYPE {
  TASK = "TASK",
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
}

export enum ACTIVITY_STATUS {
  // OPEN
  DRAFT = "DRAFT", // if task is closed without saving
  // Approval by manager, like for meetings, or some serious emails or calls
  NEED_APPROVAL = "NEED_APPROVAL",
  BACKLOG = "BACKLOG", // DEFAULT STATUS
  TODO = "TODO", // Employee marks it, that now he is going to working on it soon
  IN_PROGRESS = "IN_PROGRESS",

  // SCHEDULED
  SCHEDULED = "SCHEDULED",

  // COMPLETED
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}

export enum ACTIVITY_STATUS_SHORT {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  SCHEDULED = "SCHEDULED",
}
const tableName = Tables.activities;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("company_id")
        .notNullable()
        .index()
        .references("id")
        .inTable(Tables.companies)
        .onUpdate("CASCADE")
        .onDelete("CASCADE");
      table
        .uuid("created_by")
        .notNullable()
        .index()
        .references("id")
        .inTable(Tables.employees)
        .onDelete("SET NULL");
      table.string("summary");
      table.jsonb("details").notNullable().defaultTo({});
      table.jsonb("remarks").notNullable().defaultTo(JSON.stringify([]));
      table
        .enum("activity_type", Object.values(ACTIVITY_TYPE))
        .defaultTo(ACTIVITY_TYPE.TASK);
      table.jsonb("concerned_person_details").defaultTo(JSON.stringify([]));
      table
        .enum("status", Object.values(ACTIVITY_STATUS))
        .defaultTo(ACTIVITY_STATUS.BACKLOG);
      table
        .enum("status_short", Object.values(ACTIVITY_STATUS_SHORT))
        .defaultTo(ACTIVITY_STATUS_SHORT.OPEN);
      table.jsonb("tags").notNullable().defaultTo([]);
      table.jsonb("reminders").notNullable().defaultTo([]);
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

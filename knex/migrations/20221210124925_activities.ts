import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";


export enum ACTIVITY_TYPE {
  TASK = "TASK",
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
}

export enum ACTIVITY_STATUS_SHORT {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  SCHEDULED = "SCHEDULED",
}

export enum ACTIVITY_STATUS {
  NOT_STARTED = "NOT_STARTED",
  NEED_APPROVAL = "NEED_APPROVAL",
  WAITING_FOR_SOMEONE_ELSE = "WAITING_FOR_SOMEONE_ELSE",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  DEFERRED = "DEFERRED",
}

export const ACTIVITY_STATUSES = [
  "NOT_STARTED",
  "NEED_APPROVAL",
  "WAITING_FOR_SOMEONE_ELSE",
  "IN_PROGRESS",
  "COMPLETED",
  "DEFERRED",
];

export enum ACTIVITY_PRIORITY {
  NONE = "NONE",
  LOWEST = "LOWEST",
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  HIGHEST = "HIGHEST",
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
      table.jsonb("contact_details").defaultTo(JSON.stringify([]));
      table
        .enum("status", Object.values(ACTIVITY_STATUS))
        .defaultTo(ACTIVITY_STATUS.NOT_STARTED);
      table
        .enum("status_short", Object.values(ACTIVITY_STATUS_SHORT))
        .defaultTo(ACTIVITY_STATUS_SHORT.OPEN);

      table
        .enum("priority", Object.values(ACTIVITY_PRIORITY))
        .defaultTo(ACTIVITY_PRIORITY.NORMAL);
      table.boolean("scheduled").defaultTo(false);

      table.jsonb("tags").notNullable().defaultTo([]);
      table.jsonb("reminders").notNullable().defaultTo(JSON.stringify([]));
      table
        .jsonb("repeat_reminders")
        .notNullable()
        .defaultTo(JSON.stringify([]));
      table.timestamp("due_date", { useTz: true });
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

import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

export enum ReminderStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
  SENT = "SENT",
  DONE = "DONE",
}

export enum ReminderTimeType {
  Reminder_5M_Before = "Reminder_5M_Before",
  Reminder_15M_Before = "Reminder_15M_Before",
  Reminder_1H_Before = "Reminder_1H_Before",
  Reminder_24H_Before = "Reminder_24H_Before",
}

export enum ReminderType {
  GENERAL = "GENERAL",
  EMAIL = "EMAIL",
  PHONE_CALL = "PHONE_CALL",
  MEETING = "MEETING",
  TASK = "TASK",
}
const tableName = Tables.reminders;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("execution_arn");
      table.string("reminder_aws_id");
      table
        .enum("reminder_time_type", Object.values(ReminderTimeType))
        .defaultTo(ReminderTimeType.Reminder_1H_Before);
      table.string("type");
      table.integer("status_code");
      table.string("status").defaultTo(ReminderStatus.PENDING);
      table.timestamp("reminder_time", { useTz: true }).notNullable();
      table.string("scheduler_expression");

      table.jsonb("data").defaultTo({});
      table.uuid("table_row_id").index();
      table.string("table_name");
      table.uuid("created_by").notNullable();
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

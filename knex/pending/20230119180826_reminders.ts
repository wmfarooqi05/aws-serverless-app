import { Knex } from "knex";
import { tableName } from "../tables";

enum ReminderStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  SENT = "SENT",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName.reminders, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("execution_arn");
    table.uuid("object_id").index();
    table.string("object_type");
    table.string("type");
    table.string("status").defaultTo(ReminderStatus.PENDING);
    table.timestamp("reminder_time", { useTz: true }).notNullable();
    table.jsonb("data").defaultTo({});
    table.uuid("activity_id")
      .index()
      .references("id")
      .inTable(tableName.activities)
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName.reminders);
}

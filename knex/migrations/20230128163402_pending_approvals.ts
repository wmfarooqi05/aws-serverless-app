import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";

const tableName = Tables.pendingApprovals;
enum PendingApprovalsStatus {
  CANCELLED = "CANCELLED",
  ESCALATED = "",
  FAILED = "FAILED",
  PARTICIPANT_RESOLUTION_FAILED = "PARTICIPANT_RESOLUTION_FAILED",
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  SUCCESS = "SUCCESS",
  TERMINATED = "TERMINATED",
  TIMEOUT = "TIMEOUT",
  WARNING = "WARNING",
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("activityId");
      table.string("activityName");
      table
        .specificType("approvers", "uuid[]")
        .defaultTo(knex.raw("ARRAY[]::uuid[]"));
      table.uuid("createdBy");
      table
        .jsonb("on_approval_action_required")
        .defaultTo('{}');
      table.dateTime("escalationTime");
      table.boolean("skipEscalation");
      table
        .enum("status", Object.values(PendingApprovalsStatus))
        .defaultTo(PendingApprovalsStatus.PENDING);
      table.integer("retryCount").defaultTo(0);
      table.jsonb("resultPayload");
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

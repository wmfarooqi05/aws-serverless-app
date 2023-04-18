import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";


const tableName = Tables.pendingApprovals;
export enum PendingApprovalsStatus {
  ESCALATED = "ESCALATED", //	Because the original approver did not complete the RFI in the allotted amount of time, the RFI was sent to another approver.
  FAILED = "FAILED", //	The activity could not be completed. No further activity occurs.
  PARTICIPANT_RESOLUTION_FAILED = "PARTICIPANT_RESOLUTION_FAILED", // 	The activity could not be completed because the approver was deleted from the system.
  PENDING = "PENDING", //	No action was taken to complete the activity.
  SUBMITTED = "SUBMITTED", //	The activity was submitted for approval.
  SUCCESS = "SUCCESS", //	The RFI was successfully completed.
  TERMINATED = "TERMINATED", //	The process run fails with an unknown exception.
  TIMEOUT = "TIMEOUT", //	The specified amount of time to complete an activity passed. The activity is completed and a new activity is created and sent to the escalation participant.
  WARNING = "WARNING", //	The activity was partially completed. A problem occurred, preventing the work order from being successfully completed.
  REJECTED = "REJECTED",
}


export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("table_row_id");
      table.string("table_name");
      table.jsonb("approvers").defaultTo("[]");
      table.jsonb("approval_details");
      table.uuid("created_by");
      table.jsonb("on_approval_action_required").defaultTo("{}");
      table.dateTime("escalation_time");
      table.boolean("skip_escalation");
      table
        .enum("status", Object.values(PendingApprovalsStatus))
        .defaultTo(PendingApprovalsStatus.PENDING);
      table.integer("retry_count").defaultTo(0);
      table.jsonb("result_payload");
      table.uuid("batch_approval_key").nullable();
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

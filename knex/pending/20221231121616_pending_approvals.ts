import { Knex } from "knex";
import { tableName } from "../tables";

export const ApprovalStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

const enum ACTION_TYPE {
  UPDATE,
  DELETE,
}

interface IOnApprovalActionRequired {
  objectId: string;
  actionType: ACTION_TYPE;
  parameters: object;
  tableName: string;
};


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName.pendingApprovals, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("created_by")
      .notNullable()
      .index()
      .references("id")
      .inTable(tableName.users);
    table
      .uuid("assigned_to")
      .notNullable()
      .index()
      .references("id")
      .inTable(tableName.users);
    table
      .uuid("reporting_manager_id")
      .index()
      .references("id")
      .inTable(tableName.users);
    table.json("on_approval_action_required").defaultTo(onApprovalActionRequired);
    table.string("reason_statement");
    table.string("remarks_by_approver");
    table.enum("status", ApprovalStatuses).defaultTo(ApprovalStatuses[0]);
    // In case any other person can approve e.g. like super admin, create history
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
  await knex.schema.dropTable(tableName.pendingApprovals);
}

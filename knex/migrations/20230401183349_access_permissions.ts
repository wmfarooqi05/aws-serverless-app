import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";
const tableName = Tables.accessPermissions;

enum PermissionTypes {
  READ_ALL = "READ_ALL",
  READ = "READ",
  CREATE = "CREATE",
  DELETE = "DELETE",
  UPDATE = "UPDATE",
}

export const RolesArray = [
  "SALES_REP_GROUP",
  "SALES_MANAGER_GROUP",
  "REGIONAL_MANAGER_GROUP",
  "ADMIN_GROUP",
  "SUPER_ADMIN_GROUP",
];
export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

      table.enum("role", RolesArray).notNullable().defaultTo("SALES_REP_GROUP");
      table.string("table_name").notNullable();

      table.enum("permission_type", Object.values(PermissionTypes)).notNullable();
      table.jsonb("allowed_employees").notNullable().defaultTo({});
      table.string("permission_key").notNullable().unique();
      table.boolean("is_allowed").notNullable().defaultTo(true);
      table.boolean("create_pending_approval").notNullable().defaultTo(true);
      table
        .uuid("updated_by")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .notNullable();
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

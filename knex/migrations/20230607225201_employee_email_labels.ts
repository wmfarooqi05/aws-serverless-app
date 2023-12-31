import { Knex } from "knex";
import { tableName as EmailTables } from "../email_tables";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = EmailTables.employeeEmailLabels;

/** @deprecated 
 * we dont need this table
*/
export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("employee_id")
        .index()
        .references("id")
        .inTable(Tables.employees)
        .notNullable();
      table.string("label").notNullable();
      table.string("color");

      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

      table.unique(["label", "employee_id"])
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

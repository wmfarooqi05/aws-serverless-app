import { Knex } from "knex";
import { tableName as EmailTables } from "../email_tables";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = EmailTables.employeeEmailSettings;

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
      table.jsonb("labels").defaultTo([]);
      table.string("default_signature");
      table.jsonb("default_text_styles");
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

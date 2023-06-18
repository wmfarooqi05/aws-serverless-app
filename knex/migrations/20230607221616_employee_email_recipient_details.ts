import { Knex } from "knex";
import { tableName as emailTables } from "../email_tables";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = emailTables.recipientEmployeeDetails;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("recipient_id")
        .index()
        .references("id")
        .inTable(emailTables.emailRecipients)
        .notNullable();
        table
          .uuid("employee_id")
          .index()
          .references("id")
          .inTable(Tables.employees)
          .notNullable();
      table.string("folder_name").notNullable().defaultTo("inbox");
      table.string("labels");
      table.boolean("is_read").defaultTo(false);

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

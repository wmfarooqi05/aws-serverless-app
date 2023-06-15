import { Knex } from "knex";
import { tableName as Tables } from "../email_tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = Tables.employeeEmailRecipientDetails;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("recipient_id")
        .index()
        .references("id")
        .inTable(Tables.emailRecipients)
        .notNullable();
      table.string("folder_name").notNullable().defaultTo("INBOX");
      table.string("labels");
      table.boolean("is_read").defaultTo(false);
      table.string("category");

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

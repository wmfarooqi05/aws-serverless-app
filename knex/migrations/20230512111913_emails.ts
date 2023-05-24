import { Knex } from "knex";
import { tableName as Tables } from "../email_tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = Tables.emails;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("subject", 255).notNullable();
      table.string("body", 4000).notNullable();
      table.timestamp("sent_at").defaultTo(knex.fn.now());

      table.string("direction");
      table.uuid("company_id");
      table.uuid("contact_id");
      table.string("status").notNullable();
      table.jsonb("attachments");
      table.boolean("is_body_uploaded").defaultTo(false);
      table.string("ses_message_id");
      table.enum('type', ['SIMPLE_MAIL', 'BULK']).defaultTo('SIMPLE_MAIL');
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

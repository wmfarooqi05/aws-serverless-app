import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
const tableName = Tables.contactEmails;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("contact_id")
        .references("id")
        .inTable(Tables.contacts)
        .notNullable();

      table.string("email").notNullable();
      table.string("email_type");

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
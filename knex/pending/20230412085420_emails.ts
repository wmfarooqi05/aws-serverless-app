import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers";
const tableName = Tables.emails;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("secondary_id");
      table.string("body", 4000);
      table
        .string("sender_id")
        .notNullable()
        .index()
        .references("id")
        .inTable(Tables.employees);
      table.string("sender_email").notNullable();

      table.string("recipient_email").notNullable();
      table.uuid("recipient_id"); // In case company is registered

      table.string("sent_date");
      table.enum("service_provider", ["AMAZON_SES", "GOOGLE"]);
      table
        .uuid("updated_by")
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

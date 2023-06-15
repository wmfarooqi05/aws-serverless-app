import { Knex } from "knex";
import { tableName as EmailTables } from "../email_tables";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = EmailTables.companyEmailRecipientDetails;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("company_id")
        .index()
        .references("id")
        .inTable(Tables.companies)
        .notNullable();
      table
        .uuid("contact_id")
        .index()
        .references("id")
        .inTable(Tables.contacts)
        .notNullable();
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

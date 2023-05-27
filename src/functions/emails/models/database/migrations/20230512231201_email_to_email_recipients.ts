import { Knex } from "knex";
import { tableName as Tables } from "../email_tables";
const tableName = Tables.emailToEmailRecipients;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table
      .uuid("email_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(Tables.emails)
      .onDelete("NO ACTION");
    table
      .uuid("recipient_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(Tables.emailRecipients)
      .onDelete("NO ACTION");
    table.primary(["email_id", "recipient_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

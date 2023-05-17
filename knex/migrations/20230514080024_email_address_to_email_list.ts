import { Knex } from "knex";
import { tableName as Tables } from "../tables";
const tableName = Tables.emailAddressToEmailList;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table
      .uuid("email_address_id")
      .references("id")
      .inTable(Tables.emailAddresses)
      .notNullable()
      .onDelete('NO ACTION');
    table
      .uuid("email_list_id")
      .references("id")
      .inTable(Tables.emailList)
      .notNullable()
      .onDelete('NO ACTION');

    table.primary(["email_address_id", "email_list_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

import { Knex } from "knex";
import { tableName as Tables } from "../email_tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
const tableName = Tables.emailOptOuts;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

      table.string("email").notNullable();
      table.string("reason").notNullable();

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

import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = Tables.filePermissions;

/** @deprecated
 * we dont need this table
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("file_url").notNullable().unique();
      table.string("file_key");
      table.string("bucket");
      table.string("region");
      table.string("file_type");
      table.string("file_size");
      table.string("original_name");
      table.string("thumbnail_status");
      table.string("thumbnail_url");
      table.jsonb("permissions");
      table.string("upload_status");
      table.jsonb("error");

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

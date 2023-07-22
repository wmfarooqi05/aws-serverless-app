import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";

const tableName = Tables.fileRecords;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("file_url").notNullable().unique();

      table.string("s3_key");
      table.string("file_name");
      table.string("file_type");
      table.string("file_size");
      table.string("resolution");

      table.string("bucket_name");
      table.string("region");
      table.string("original_filename");
      table.jsonb("details");
      table.jsonb("permissions");
      table.string("status");

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

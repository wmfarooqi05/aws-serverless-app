import { Knex } from "knex";
import { tableName as Tables } from "../email_tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
const tableName = Tables.emailTemplates;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

      table.string("template_name").notNullable();
      table.string("template_ses_name").notNullable();
      table.jsonb("placeholders");
      table.string("aws_region").notNullable();
      table.string("version").notNullable().defaultTo("1");
      table.string("subject");
      table.string("html_part_url");
      table.string("text_part_url");
      table.string("thumbnail_url");
      table.jsonb("details");
      table.string("status");
      table.string("updated_by");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

      table.unique(["template_name", "aws_region", "version"]);
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

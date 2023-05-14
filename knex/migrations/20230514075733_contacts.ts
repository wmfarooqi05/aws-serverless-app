import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
const tableName = Tables.contacts;

export interface IContact {
  id: string;
  name: string;
  designation: string;
  phoneNumbers: string[];
  emails: string[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
  emailList: string[];
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("company_id")
        .references("id")
        .inTable(Tables.companies)
        .notNullable();

      table.string("name").defaultTo(JSON.stringify([]));
      table.string("designation").defaultTo(JSON.stringify([]));
      table.jsonb("phone_numbers").defaultTo(JSON.stringify([]));
      table.jsonb("details").defaultTo(JSON.stringify({}));
      table.string("timezone").defaultTo(JSON.stringify([]));

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
import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";
const tableName = Tables.teamCompanyInteraction;

export enum COMPANY_STAGES {
  LEAD = "LEAD",
  CONTACT = "CONTACT", // maybe contact or client
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("team_id")
        .references("id")
        .inTable(Tables.teams)
        .notNullable()

      table
        .uuid("company_id")
        .references("id")
        .inTable(Tables.companies)
        .notNullable()

      table.jsonb("team_interaction_details").defaultTo(JSON.stringify({}));
      table
        .enum("stage", Object.values(COMPANY_STAGES))
        .defaultTo(COMPANY_STAGES.LEAD);
      // table.string("tags").defaultTo(""); // @TODO fix this
      // table.jsonb("notes").defaultTo([]);

      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

      table.index(["company_id", "team_id"]);
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

import { Knex } from "knex";
import { tableName as Tables } from "../tables";
import { onUpdateTrigger } from "../triggers/onUpdateTimestampTrigger";


const tableName = Tables.notifications;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable(tableName, (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("title").notNullable();
      table.string("subtitle");
      table
        .uuid("sender_employee")
        .references("id")
        .inTable(Tables.employees)
        .onDelete("SET NULL");

      table
        .uuid("receiver_employee")
        .notNullable()
        .index()
        .references("id")
        .inTable(Tables.employees)
        .onDelete("CASCADE");

      table.jsonb("extra_data");
      table.string("notification_type").notNullable();
      table.boolean("read_status").defaultTo(false);
      table.boolean("is_scheduled").defaultTo(false);

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

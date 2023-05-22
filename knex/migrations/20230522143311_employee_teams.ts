import { Knex } from "knex";
import { tableName as Tables } from "../tables";
const tableName = Tables.employeeTeams;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table
      .uuid("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(Tables.employees)
      .onDelete("CASCADE");
    table
      .uuid("team_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(Tables.teams)
      .onDelete("CASCADE");
    table.primary(["employee_id", "team_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}

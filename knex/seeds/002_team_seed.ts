import { Knex } from "knex";
import { snakeCase } from "lodash";
import { tableName } from "../tables";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex(tableName.teams).del();

  // Inserts seed entries[
  const objects = [
    {
      id: "24312b31-3f85-479a-bd66-8f59a67ab1e2",
      teamName: "toronto_team",
    },
    {
      id: "914bc1aa-165b-463c-94c3-42108324c75f",
      teamName: "east_team",
    },
    {
      id: "b37406d7-1b9f-4fd4-ab2f-756b93e3abeb",
      teamName: "west_team",
    },
  ];

  const seeds = objects.map((seed) => {
    const obj = {};
    Object.keys(seed).map((key) => {
      obj[snakeCase(key)] = seed[key];
      if (typeof seed[key] === "object") {
        obj[snakeCase(key)] = JSON.stringify(seed[key]);
      }
    });
    return obj;
  });

  await knex(tableName.teams).insert(seeds);
}

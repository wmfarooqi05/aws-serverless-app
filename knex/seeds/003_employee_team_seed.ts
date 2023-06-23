import { Knex } from "knex";
import { snakeCase } from "lodash";
import { tableName } from "../tables";
import { IEmployeeTeam } from "../../src/models/EmployeeTeams";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex(tableName.employeeTeams).del();

  // Inserts seed entries[
  const objects: IEmployeeTeam[] = [
    {
      employeeId: "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
      teamId: "24312b31-3f85-479a-bd66-8f59a67ab1e2",
    },
    {
      employeeId: "d4dfb117-6c1e-4e25-95d4-95f0b8879ded",
      teamId: "24312b31-3f85-479a-bd66-8f59a67ab1e2",
    },
    {
      employeeId: "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b",
      teamId: "914bc1aa-165b-463c-94c3-42108324c75f",
    },
    {
      employeeId: "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b",
      teamId: "24312b31-3f85-479a-bd66-8f59a67ab1e2",
    },
    {
      employeeId: "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b",
      teamId: "b37406d7-1b9f-4fd4-ab2f-756b93e3abeb",
    },
    {
      employeeId: "28758dac-a6a2-4f90-96ed-0a42a37d3fb3",
      teamId: "914bc1aa-165b-463c-94c3-42108324c75f",
    },
    {
      employeeId: "28758dac-a6a2-4f90-96ed-0a42a37d3fb3",
      teamId: "24312b31-3f85-479a-bd66-8f59a67ab1e2",
    },
    {
      employeeId: "28758dac-a6a2-4f90-96ed-0a42a37d3fb3",
      teamId: "b37406d7-1b9f-4fd4-ab2f-756b93e3abeb",
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

  await knex(tableName.employeeTeams).insert(seeds);
}

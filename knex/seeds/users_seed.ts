import { Knex } from "knex";
import { tableName } from "..";
import { UserRolesMigrate } from '../migrations/20221210110010_users';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex(tableName.users).del();

  // Inserts seed entries
  await knex(tableName.users).insert([
    {
      id: "ef19fed2-8862-4412-980e-886812e3fd9c",
      email: "wmfarooqi05@gmail.com",
      name: "waleed [manager]",
      enabled: true,
      role: UserRolesMigrate[4],
    //   email_verified: true,
    //   phone_verified: false,
      reporting_manager: 'ef19fed2-8862-4412-980e-886812e3fd9c',
    },
    {
      id: "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
      email: "wmfarooqi70@gmail.com",
      name: "waleed",
      enabled: true,
      role: UserRolesMigrate[0],
    //   email_verified: true,
    //   phone_verified: false,
      reporting_manager: 'ef19fed2-8862-4412-980e-886812e3fd9c',
    },
  ]);
}

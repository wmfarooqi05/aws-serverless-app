import { Knex } from "knex";
import {
  GenderArray,
  IEmployee,
  RolesArray,
} from "../../src/models/interfaces/Employees";
import { snakeCase, startCase, toLower } from "lodash";
import { tableName } from "../tables";

const settings = {
  dateFormat: "DD/MM/YYYY",
};

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex(tableName.employees).del();

  // Inserts seed entries[
  const employeeObjects: IEmployee[] = [
    {
      id: "0d2ce8e1-bc5f-4319-9aef-19c5e999ccf3",
      picture: null,
      username: "wmfarooqi70",
      email: "wmfarooqi70@gmail.com",
      name: "Waleed Farooqi",
      jobTitle: startCase(toLower(RolesArray[0])),
      role: "SALES_REP",
      addresses: [],
      emailVerified: true,
      phoneNumberVerified: false,
      phoneNumber: "+17734444123",
      settings,
      socialProfiles: {},
      timezone: process.env.CANADA_DEFAULT_TIMEZONE || "America/Toronto",
      addedBy: "d4dfb117-6c1e-4e25-95d4-95f0b8879ded",
      employeeStatus: "ENABLED",
      reportingManager: "d4dfb117-6c1e-4e25-95d4-95f0b8879ded",
      details: {},
      gender: GenderArray[0],
      secondaryPhoneNumbers: [],
    },
    {
      id: "d4dfb117-6c1e-4e25-95d4-95f0b8879ded",
      picture: null,
      username:"hazyhassan888",
      email: "hazyhassan888@gmail.com",
      name: "hassan\t",
      jobTitle: "Sales Rep",
      role: "SALES_REP",
      addresses: [],
      emailVerified: true,
      phoneNumberVerified: false,
      phoneNumber: "+177344442323",
      settings,
      socialProfiles: {},
      timezone: process.env.CANADA_DEFAULT_TIMEZONE || "America/Toronto",
      addedBy: "28758dac-a6a2-4f90-96ed-0a42a37d3fb3",
      employeeStatus: "ENABLED",
      reportingManager: "28758dac-a6a2-4f90-96ed-0a42a37d3fb3",
      details: {},
      gender: GenderArray[0],
      secondaryPhoneNumbers: [],
    },
    {
      id: "28758dac-a6a2-4f90-96ed-0a42a37d3fb3",
      picture: null,
      username:"adminelywork",
      email: "admin@elywork.com",
      name: "Admin Elywork",
      jobTitle: startCase(toLower(RolesArray[2])),
      role: "REGIONAL_MANAGER",
      addresses: [],
      emailVerified: true,
      phoneNumberVerified: false,
      phoneNumber: "+17734444234",
      settings,
      socialProfiles: {},
      timezone: process.env.CANADA_DEFAULT_TIMEZONE || "America/Toronto",
      addedBy: "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b",
      employeeStatus: "ENABLED",
      reportingManager: "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b",
      details: {},
      gender: "Male",
      secondaryPhoneNumbers: [],
    },
    {
      id: "4d16b24f-e0ff-44e7-bbd0-de79fc9b849b",
      picture:
        "https://w7.pngwing.com/pngs/129/292/png-transparent-female-avatar-girl-face-woman-user-flat-classy-users-icon.png",
      email: "wmfarooqi05@gmail.com",
      username:"wmfarooqi05",
      name: "Waleed M Farooqi",
      jobTitle: startCase(toLower(RolesArray[4])),
      role: "SUPER_ADMIN",
      addresses: [
        {
          city: "Lahore",
          title: "home",
          address: "House abc",
          defaultAddress: false,
        },
        {
          city: "Lahore",
          title: "home",
          address: "House abc",
          defaultAddress: true,
        },
      ],
      birthdate: "2023-06-19",
      emailVerified: true,
      phoneNumberVerified: true,
      phoneNumber: "+17332443222",
      settings,
      socialProfiles: {},
      timezone: process.env.CANADA_DEFAULT_TIMEZONE || "America/Toronto",
      employeeStatus: "ENABLED",
      details: {},
      gender: "Male",
      secondaryPhoneNumbers: [{ title: "home", phoneNumber: "+9211223344" }],
    },
  ];

  const seeds = employeeObjects.map((seed) => {
    const obj = {};
    Object.keys(seed).map((key) => {
      obj[snakeCase(key)] = seed[key];
      if (typeof seed[key] === "object") {
        obj[snakeCase(key)] = JSON.stringify(seed[key]);
      }
    });
    return obj;
  });

  await knex(tableName.employees).insert(seeds);
}

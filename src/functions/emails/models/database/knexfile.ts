import type { Knex } from "knex";
import * as pg from "pg";

pg.defaults.ssl = true;

type ENV = "local" | "dev" | "stage" | "production";

const connection = {
  host: process.env.EMAIL_DB_HOSTNAME,
  database: process.env.EMAIL_DB_NAME,
  user: process.env.EMAIL_DB_USERNAME,
  password: process.env.EMAIL_DB_PASSWORD,
  port: process.env.EMAIL_DB_PORT ? parseInt(process.env.EMAIL_DB_PORT) : 5432,
  ssl: false, //{ rejectUnauthorized: false },
};
console.log("connection", connection);

export const config: Record<ENV, Knex.Config> = {
  local: {
    client: "pg",
    useNullAsDefault: true,
    // connection: 'postgres://postgres@localhost/osm-teams?sslmode=disable'
    connection: {
      host: process.env.EMAIL_DB_HOSTNAME,
      database: process.env.EMAIL_DB_NAME,
      user: process.env.EMAIL_DB_USERNAME,
      password: process.env.EMAIL_DB_PASSWORD,
      port: process.env.EMAIL_DB_PORT
        ? parseInt(process.env.EMAIL_DB_PORT)
        : 5432,
      ssl: false, //{ rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    // seeds: {
    //   directory: "./seeds",
    // },
  },
  dev: {
    client: "pg",
    useNullAsDefault: true,
    connection: {
      host: process.env.EMAIL_DB_HOSTNAME,
      database: process.env.EMAIL_DB_NAME,
      user: process.env.EMAIL_DB_USERNAME,
      password: process.env.EMAIL_DB_PASSWORD,
      port: process.env.EMAIL_DB_PORT
        ? parseInt(process.env.EMAIL_DB_PORT)
        : 5432,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
  },
  stage: {
    client: "pg",
    useNullAsDefault: true,
    connection: {
      host: process.env.EMAIL_DB_HOSTNAME,
      database: process.env.EMAIL_DB_NAME,
      user: process.env.EMAIL_DB_USERNAME,
      password: process.env.EMAIL_DB_PASSWORD,
      port: process.env.EMAIL_DB_PORT
        ? parseInt(process.env.EMAIL_DB_PORT)
        : 5432,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    // migrations: {
    //   tableName: "knex_migrations",
    //   directory: "./migrations",
    // },
  },
  // uncomment for production
  production: {
    client: "pg",
    connection: {
      host: process.env.EMAIL_DB_HOSTNAME,
      database: process.env.EMAIL_DB_NAME,
      user: process.env.EMAIL_DB_USERNAME,
      password: process.env.EMAIL_DB_PASSWORD,
      port: process.env.EMAIL_DB_PORT
        ? parseInt(process.env.EMAIL_DB_PORT)
        : 5432,
      ssl: { rejectUnauthorized: false }, // install ssl lib and delete line
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
  },
};

import type { Knex } from "knex";
import * as pg from "pg";
pg.defaults.ssl = true;

type ENV = "local" | "dev" | "stage" | "production";

export const config: Record<ENV, Knex.Config> = {
  local: {
    client: "pg",
    useNullAsDefault: true,
    connection: {
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
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
  dev: {
    client: "pg",
    useNullAsDefault: true,
    connection: {
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
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
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    // migrations: {
    //   tableName: "knex_migrations",
    //   directory: "./src/database/migrations",
    // },
  },
  // uncomment for production
  production: {
    client: "pg",
    connection: {
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      ssl: { rejectUnauthorized: false }, // install ssl lib and delete line
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./src/database/migrations",
    },
  },
};

import type { Knex } from "knex";
import * as pg from "pg";

pg.defaults.ssl = true;

type ENV = "local" | "dev" | "stage" | "production";

export const config: Record<ENV, Knex.Config> = {
  local: {
    client: "pg",
    useNullAsDefault: true,
    // connection: 'postgres://postgres@localhost/osm-teams?sslmode=disable'
    connection: {
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      ssl: false, //{ rejectUnauthorized: false },
    },
    pool: {
      min: 0,
      max: 1,
      idleTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT_OVERRIDE
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT_OVERRIDE)
        : parseInt(process.env.TIMEOUT),
      // afterCreate: (conn, done) => {
      //   conn.query('SET timezone="UTC";', (err)=>{
      //     if (err) {
      //       console.log(err)
      //     }
      //     done(err, conn)
      //   })
      // }
    },
    acquireConnectionTimeout: 30000,
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
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
      min: 0,
      max: 1,
      /** This is kept 15 seconds for Job Endpoints
       * In future, we can keep it 3sec and for job endpoints,
       * we can add special timeout of 15 seconds
       */
      idleTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT_OVERRIDE
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT_OVERRIDE)
        : parseInt(process.env.TIMEOUT),
    },
    acquireConnectionTimeout: 30000,
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
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
      min: 1,
      max: 10,
      idleTimeoutMillis: 30000,
    },
    acquireConnectionTimeout: 30000,
    seeds: {
      directory: "./seeds",
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
      min: 1,
      max: 10,
      idleTimeoutMillis: 30000,
    },
    acquireConnectionTimeout: 30000,
    migrations: {
      tableName: "knex_migrations",
      directory: "./src/database/migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
};

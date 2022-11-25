import { Dialect, Sequelize } from 'sequelize'
import * as pg from 'pg'

const dbName = "ge-db-dev-1";
const dbUser = "postgres";
const dbHost = "ge-db-dev-1.cluster-cyb3arxab5e4.ca-central-1.rds.amazonaws.com";
const dbDriver = 'postgres' as Dialect
const dbPassword = "v16pwn1QyN8iCixbWfbL";

exports.func = async (_, { uuid }) => {
  var client = new pg.Client({
    host: process.env.POSTGRESQL_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.USERNAME,
    password: process.env.PASSWORD
  });
  client.connect()
  // await common.init(client)
  var resp = await common.getUser(client, uuid);
  client.end();
  return resp;
}

const sequelizeConnection = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  dialect: dbDriver,
  port: 5432,
  // port: Number(process.env.DB_PORT),
  dialectModule: pg,
})

export default sequelizeConnection;

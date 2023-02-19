import * as dotenv from "dotenv";
import * as path from "path";
const envFilePath = path.join(
  __dirname,
  "../",
  `.env.${process.env.NODE_ENV}`
);

dotenv.config({ path: envFilePath });
const knexConfig = require("./knexfile");

module.exports = knexConfig.config[process.env.NODE_ENV || 'local'];

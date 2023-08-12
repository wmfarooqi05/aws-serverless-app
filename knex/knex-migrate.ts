import * as dotenv from "dotenv";
import * as path from "path";
const envFilePath = path.join(__dirname, "../", `.env.${process.env.NODE_ENV}`);

dotenv.config({ path: envFilePath });
const knexConfig = require("./knexfile");
if (!(process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "local")) {
  console.warn(
    "WARNING: Knex connection and pooling settings are not updated for evn:",
    process.env.NODE_ENV
  );
}

module.exports = knexConfig.config[process.env.NODE_ENV || "local"];

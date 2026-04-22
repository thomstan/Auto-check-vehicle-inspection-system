const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "vehicle_inspection",
  password: "2414",
  port: 5432,
});

module.exports = pool;
const { Pool } = require("pg");
require("dotenv").config();

// If DATABASE_URL exists (on Render), use it. 
// Otherwise, fall back to your local development variables.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Render requires SSL for PostgreSQL
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

module.exports = pool;
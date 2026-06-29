// Postgres connection pool, shared across the app.
// Reads DATABASE_URL from the environment (works with Render, Railway,
// Heroku, Fly.io, and any local Postgres install — they all use this
// same standard connection-string convention).

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "\n❌ Missing DATABASE_URL environment variable.\n" +
      "   Create a server/.env file (see .env.example) with:\n" +
      "   DATABASE_URL=postgres://user:password@host:port/dbname\n"
  );
  process.exit(1);
}

// Render/Railway/Heroku-hosted Postgres requires SSL in production,
// but local Postgres usually doesn't have a cert configured at all.
// This flag lets one codebase handle both without edits.
const useSSL = process.env.DATABASE_SSL !== "false";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});

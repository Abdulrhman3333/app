// Run once (and safe to re-run) to create all tables.
// Usage: npm run db:migrate

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  console.log("Running migrations...");
  await pool.query(sql);
  console.log("✅ Database schema is up to date.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});

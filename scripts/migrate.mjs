import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL no .env.local antes da migração.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const dbDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");
  const files = (await readdir(dbDir)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  for (const file of files) {
    await pool.query(await readFile(join(dbDir, file), "utf8"));
    console.log(`Migração aplicada: ${file}`);
  }
}
finally { await pool.end(); }

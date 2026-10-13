import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pool?: Pool };
export const pool = globalForPg.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});
if (process.env.NODE_ENV !== "production") globalForPg.pool = pool;

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values: unknown[] = []) {
  const result = await pool.query<T>(sql, values);
  return result;
}

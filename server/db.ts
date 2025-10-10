import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search_path on every connection to ensure public schema is searched first
// This is critical for production (PgBouncer) which strips the options flag
pool.on('connect', async (client) => {
  await client.query('SET search_path TO public,auth');
});

export const db = drizzle(pool, { schema });

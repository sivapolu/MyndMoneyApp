import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Add search_path to DATABASE_URL to ensure public schema is used first
// This works with PgBouncer by adding it directly to the connection string
let connectionString = process.env.DATABASE_URL;
if (!connectionString.includes('options=')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString = `${connectionString}${separator}options=-c%20search_path%3Dpublic%2Cauth`;
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

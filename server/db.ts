import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required");
}

// Export Supabase client for auth, realtime, and PostgREST API
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Drizzle setup - use transaction pooler connection
// Extract the project reference
const projectRef = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

// Build connection string - using transaction mode pooler
// Note: This requires the database password from Supabase project settings
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.warn('SUPABASE_DB_PASSWORD not set - database operations may fail');
}

const connectionString = `postgres://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const client = postgres(connectionString, {
  prepare: false,
  max: 1,
});

export const db = drizzle(client, { schema });

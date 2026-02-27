import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

function getDatabaseUrl(): string {
  // Always prefer DATABASE_URL environment variable (set as secret in deployments)
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) {
    console.log('Using DATABASE_URL from environment variable');
    return envUrl;
  }

  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

let db: ReturnType<typeof drizzle>;

try {
  const databaseUrl = getDatabaseUrl();
  const sql = neon(databaseUrl);
  db = drizzle(sql, { schema });
  console.log('Database connection initialized successfully');
} catch (error) {
  console.error('Failed to initialize database connection:', error);
  throw error;
}

export { db };

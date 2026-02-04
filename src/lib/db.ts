import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/storage/database/shared/schema';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDirectDb() {
  if (!pool) {
    const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('Database connection string not found. Please set PGDATABASE_URL or DATABASE_URL environment variable.');
    }

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  if (!db) {
    db = drizzle(pool, { schema });
  }

  return db;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

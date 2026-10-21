import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database client factory. Works with:
 *  - a real PostgreSQL server when DATABASE_URL is set (production, Supabase, etc.);
 *  - an embedded PostgreSQL (PGlite) for zero-install local development and tests.
 * Both drivers expose the same Drizzle query API.
 */
export type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

const MIGRATIONS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle");

export async function createPgliteDb(dataDir?: string) {
  if (dataDir) fs.mkdirSync(path.dirname(path.resolve(/*turbopackIgnore: true*/ dataDir)), { recursive: true });
  const opts = { extensions: { pg_trgm } };
  const client = dataDir ? new PGlite(dataDir, opts) : new PGlite(opts);
  const db = drizzlePglite(client, { schema });
  return { db, client, migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_DIR }) };
}

export function createPostgresDb(url: string) {
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  });
  const db = drizzlePg(pool, { schema }) as unknown as Db;
  return {
    db,
    pool,
    migrate: () =>
      migratePg(db as unknown as Parameters<typeof migratePg>[0], { migrationsFolder: MIGRATIONS_DIR }),
  };
}

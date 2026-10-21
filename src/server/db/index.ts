import { createPgliteDb, createPostgresDb, type Db } from "./client";

const g = globalThis as unknown as { __vendoDb?: Promise<Db> };

async function init(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    // Production databases are migrated explicitly with `npm run db:migrate`.
    return createPostgresDb(url).db;
  }
  // Embedded local PostgreSQL. Migrations are applied automatically on first use.
  const c = await createPgliteDb(process.env.PGLITE_DIR || "./.data/pglite");
  await c.migrate();
  return c.db;
}

/** Returns the shared database instance (one per server process). */
export function getDb(): Promise<Db> {
  return (g.__vendoDb ??= init());
}

/** Test hook: use a specific database instance. */
export function setDbForTests(db: Db) {
  g.__vendoDb = Promise.resolve(db);
}

export type { Db };
export * as t from "./schema";

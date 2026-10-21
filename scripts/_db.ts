import { config } from "dotenv";
import { createPgliteDb, createPostgresDb } from "../src/server/db/client";

config({ path: ".env.local" });
config();

/** Opens the configured database for CLI scripts and applies migrations. */
export async function openDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const c = createPostgresDb(url);
    return { db: c.db, migrate: c.migrate, close: () => c.pool.end() };
  }
  const c = await createPgliteDb(process.env.PGLITE_DIR || "./.data/pglite");
  return { db: c.db, migrate: c.migrate, close: () => c.client.close() };
}

/**
 * Runs before `next build` on Vercel production deployments:
 *  1. applies database migrations;
 *  2. seeds reference data (idempotent, never overwrites admin edits);
 *  3. creates the Super Admin from ADMIN_USERNAME / ADMIN_PASSWORD, or re-syncs its password/role if they drifted.
 * Preview deployments skip this so they never change the production database.
 */
import { setDbForTests } from "../src/server/db";
import { createPostgresDb } from "../src/server/db/client";
import { seedReferenceData } from "../src/server/seed/run";
import { ensureSuperAdmin } from "../src/server/services/users";

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log(`[vercel-build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "none"}: database setup skipped.`);
    return;
  }
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set for production.");
  const { db, migrate, pool } = createPostgresDb(url);
  await migrate();
  console.log("[vercel-build] migrations applied");
  await seedReferenceData(db);
  console.log("[vercel-build] reference data ensured");
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    setDbForTests(db);
    const res = await ensureSuperAdmin(username, password);
    const state = res.created ? "created" : res.updated ? "updated from ADMIN_PASSWORD" : "already up to date";
    console.log(`[vercel-build] Super Admin "${username}" ${state}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

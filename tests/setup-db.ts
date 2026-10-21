import { eq, sql } from "drizzle-orm";
import { createPgliteDb } from "@/server/db/client";
import { setDbForTests } from "@/server/db";
import { categories, users } from "@/server/db/schema";
import { seedReferenceData } from "@/server/seed/run";
import { hashPassword } from "@/server/auth/password";
import type { Role } from "@/server/auth/permissions";

/** Fresh in-memory PostgreSQL with migrations and reference data applied. */
export async function setupTestDb() {
  const { db, migrate } = await createPgliteDb();
  await migrate();
  await seedReferenceData(db);
  setDbForTests(db);
  return db;
}

let n = 0;
export async function makeUser(db: Awaited<ReturnType<typeof setupTestDb>>, role: Role = "user", extra: Partial<typeof users.$inferInsert> = {}) {
  n++;
  const [u] = await db
    .insert(users)
    .values({ email: `u${n}-${Date.now()}@test.local`, displayName: `Test ${n}`, passwordHash: await hashPassword("password123"), role, ...extra })
    .returning();
  return u!;
}

export async function categoryId(db: Awaited<ReturnType<typeof setupTestDb>>, slug: string) {
  const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  return c!.id;
}

export async function cityId(db: Awaited<ReturnType<typeof setupTestDb>>) {
  const r = await db.execute<{ id: number }>(sql`select id from cities where slug = 'tashkent'`);
  return (r as unknown as { rows: { id: number }[] }).rows[0]!.id;
}

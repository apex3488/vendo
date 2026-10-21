import { lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { passwordResetTokens, rateLimits } from "../db/schema";
import { purgeExpiredSessions } from "../auth/sessions";
import { expireOldListings } from "./listings";
import { expirePaidFeatures } from "./monetization";

const g = globalThis as unknown as { __vendoMaintenanceAt?: number };

/** Periodic housekeeping. Safe to run often; also exposed at /api/cron/maintenance. */
export async function runMaintenance() {
  const db = await getDb();
  const expired = await expireOldListings();
  await expirePaidFeatures();
  await purgeExpiredSessions(db);
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date(Date.now() - 86_400_000)));
  await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < now() - interval '2 days'`);
  return { expiredListings: expired };
}

/** Runs maintenance at most every 10 minutes per server process (no cron needed in dev). */
export async function maybeRunMaintenance() {
  const now = Date.now();
  if (g.__vendoMaintenanceAt && now - g.__vendoMaintenanceAt < 10 * 60_000) return;
  g.__vendoMaintenanceAt = now;
  try {
    await runMaintenance();
  } catch (e) {
    console.error("[maintenance] failed", e);
  }
}

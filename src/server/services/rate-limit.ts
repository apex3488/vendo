import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { ServiceError } from "../errors";

/**
 * Fixed-window rate limiter stored in PostgreSQL, so it works across server instances
 * without extra infrastructure. Returns true when the call is allowed.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN now() ELSE rate_limits.window_start END
    RETURNING count`);
  const rows = (res as unknown as { rows: { count: number }[] }).rows;
  return Number(rows[0]?.count ?? 0) <= limit;
}

export async function enforce(key: string, limit: number, windowSeconds: number) {
  if (!(await hit(key, limit, windowSeconds))) throw new ServiceError("rate_limited");
}

/** Keyed hash of an IP so raw addresses are never stored. */
export function hashIp(ip: string | null | undefined) {
  const secret = process.env.APP_SECRET || "dev-secret";
  return createHmac("sha256", secret)
    .update(ip || "unknown")
    .digest("hex")
    .slice(0, 32);
}

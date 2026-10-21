import { count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { adminAuditLogs, listings, payments, promotions, reports, stores, storeSubscriptions, users } from "../db/schema";

export async function getDashboardStats() {
  const db = await getDb();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [usersTotal, usersNew, active, pending, openReports, activeStores, activeSubs, pendingPaid, succeededPayments] = await Promise.all([
    one(db.select({ n: count() }).from(users)),
    one(db.select({ n: count() }).from(users).where(gte(users.createdAt, weekAgo))),
    one(db.select({ n: count() }).from(listings).where(sql`${listings.status} = 'active' AND ${listings.deletedAt} IS NULL`)),
    one(db.select({ n: count() }).from(listings).where(sql`${listings.status} = 'pending' AND ${listings.deletedAt} IS NULL`)),
    one(db.select({ n: count() }).from(reports).where(eq(reports.status, "open"))),
    one(db.select({ n: count() }).from(stores).where(eq(stores.status, "active"))),
    one(db.select({ n: count() }).from(storeSubscriptions).where(sql`${storeSubscriptions.status} = 'active' AND ${storeSubscriptions.endsAt} > now()`)),
    one(
      db
        .select({ n: sql<number>`((select count(*) from promotions where status = 'pending_payment') + (select count(*) from store_subscriptions where status = 'pending_payment'))::int` })
        .from(sql`(select 1) as x`),
    ),
    one(db.select({ n: count() }).from(payments).where(eq(payments.status, "succeeded"))),
  ]);
  const registrations = await db
    .select({ day: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(users)
    .where(gte(users.createdAt, new Date(Date.now() - 14 * 86_400_000)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const activePromotions = await one(db.select({ n: count() }).from(promotions).where(eq(promotions.status, "active")));
  return {
    usersTotal,
    usersNew,
    active,
    pending,
    openReports,
    activeStores,
    activeSubs,
    pendingPaid,
    activePromotions,
    /** Revenue is shown only when a payment provider records real payments. */
    paymentsConnected: succeededPayments > 0,
    registrations,
  };
}

export async function listAudit(opts: { page: number; action?: string; actorId?: string }) {
  const db = await getDb();
  const perPage = 50;
  const conds = [];
  if (opts.action) conds.push(sql`${adminAuditLogs.action} ILIKE ${opts.action + "%"}`);
  if (opts.actorId) conds.push(eq(adminAuditLogs.actorId, opts.actorId));
  const where = conds.length ? sql.join(conds, sql` AND `) : undefined;
  return db
    .select({ log: adminAuditLogs, actorName: users.displayName })
    .from(adminAuditLogs)
    .leftJoin(users, eq(users.id, adminAuditLogs.actorId))
    .where(where)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(perPage)
    .offset((opts.page - 1) * perPage);
}

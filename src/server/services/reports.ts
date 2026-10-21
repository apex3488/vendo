import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "../db";
import { listings, reports, users } from "../db/schema";
import type { Role } from "../auth/permissions";
import { ServiceError } from "../errors";
import { audit } from "./audit";
import { notify } from "./notifications";

export const REPORT_REASONS = [
  "fraud",
  "prohibited",
  "wrong_category",
  "wrong_price",
  "duplicate",
  "offensive",
  "sold",
  "fake_contacts",
  "other",
] as const;

export const reportSchema = z.object({
  targetType: z.enum(["listing", "user"]),
  listingId: z.coerce.number().int().positive().optional(),
  targetUserId: z.string().uuid().optional(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional().default(""),
});

export async function createReport(reporterId: string, input: z.input<typeof reportSchema>) {
  const data = reportSchema.parse(input);
  const db = await getDb();
  let targetUserId: string | null = null;
  let listingId: number | null = null;
  if (data.targetType === "listing") {
    if (!data.listingId) throw new ServiceError("invalid_input", "listingId");
    const [l] = await db.select({ id: listings.id, userId: listings.userId }).from(listings).where(eq(listings.id, data.listingId));
    if (!l) throw new ServiceError("not_found");
    listingId = l.id;
    targetUserId = l.userId;
  } else {
    if (!data.targetUserId) throw new ServiceError("invalid_input", "targetUserId");
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, data.targetUserId));
    if (!u) throw new ServiceError("not_found");
    targetUserId = u.id;
  }
  if (targetUserId === reporterId) throw new ServiceError("forbidden");
  // One open report per reporter and target in 24h.
  const [dup] = await db
    .select({ n: count() })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, reporterId),
        eq(reports.targetType, data.targetType),
        listingId ? eq(reports.listingId, listingId) : eq(reports.targetUserId, targetUserId),
        gte(reports.createdAt, new Date(Date.now() - 86_400_000)),
      ),
    );
  if ((dup?.n ?? 0) > 0) throw new ServiceError("already_reported");
  const [row] = await db
    .insert(reports)
    .values({ reporterId, targetType: data.targetType, listingId, targetUserId, reason: data.reason, details: data.details || null })
    .returning({ id: reports.id });
  return row!.id;
}

const targetUser = alias(users, "target_user");
const reporter = alias(users, "reporter");

export async function adminListReports(opts: { status?: string; page: number }) {
  const db = await getDb();
  const perPage = 30;
  const where = opts.status && ["open", "resolved", "dismissed"].includes(opts.status) ? eq(reports.status, opts.status as "open") : undefined;
  const [items, [total]] = await Promise.all([
    db
      .select({
        r: reports,
        listingTitle: listings.title,
        listingSlug: listings.slug,
        listingStatus: listings.status,
        targetName: targetUser.displayName,
        reporterName: reporter.displayName,
        reportsOnTarget: sql<number>`(select count(*)::int from reports r2 where r2.target_user_id = ${reports.targetUserId})`,
      })
      .from(reports)
      .leftJoin(listings, eq(listings.id, reports.listingId))
      .leftJoin(targetUser, eq(targetUser.id, reports.targetUserId))
      .leftJoin(reporter, eq(reporter.id, reports.reporterId))
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(perPage)
      .offset((opts.page - 1) * perPage),
    db.select({ n: count() }).from(reports).where(where),
  ]);
  return { items, total: total?.n ?? 0, perPage };
}

export async function resolveReport(actor: { id: string; role: Role }, reportId: number, status: "resolved" | "dismissed", resolution: string) {
  const db = await getDb();
  const [r] = await db
    .update(reports)
    .set({ status, resolution: resolution.trim().slice(0, 1000) || null, handledBy: actor.id, handledAt: new Date() })
    .where(and(eq(reports.id, reportId), eq(reports.status, "open")))
    .returning();
  if (!r) throw new ServiceError("invalid_status");
  await audit({ actorId: actor.id, action: `report.${status}`, entityType: "report", entityId: reportId, meta: { resolution } });
  if (r.reporterId) await notify(r.reporterId, "report_resolved", { id: r.id });
}

export async function openReportsCount() {
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(reports).where(eq(reports.status, "open"));
  return r?.n ?? 0;
}

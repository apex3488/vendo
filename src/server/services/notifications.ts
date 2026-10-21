import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { notifications, users } from "../db/schema";
import { mailConfigured, sendMail } from "../mail";
import { siteUrl } from "@/lib/site";

/** Notification types; their texts live in the i18n dictionary (dict.notifications). */
export type NotificationType =
  | "listing_approved"
  | "listing_rejected"
  | "listing_blocked"
  | "listing_unpublished"
  | "listing_expired"
  | "promotion_activated"
  | "subscription_activated"
  | "report_resolved"
  | "store_verified"
  | "listing_pending_review";

export async function notify(userId: string, type: NotificationType, params: Record<string, string | number> = {}, link?: string) {
  const db = await getDb();
  await db.insert(notifications).values({ userId, type, params, link: link ?? null });
}

export async function listNotifications(userId: string, limit = 50) {
  const db = await getDb();
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function markAllRead(userId: string) {
  const db = await getDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/**
 * A listing entered the moderation queue: every active moderator/admin gets an in-app
 * notification (and an email when mail is configured and they have an address).
 */
export async function notifyModerators(listingId: number, title: string) {
  const db = await getDb();
  const staff = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(inArray(users.role, ["super_admin", "admin", "moderator"]), eq(users.status, "active")));
  if (!staff.length) return;
  const link = `/admin/listings/${listingId}`;
  await db.insert(notifications).values(staff.map((s) => ({ userId: s.id, type: "listing_pending_review", params: { title }, link })));
  if (!mailConfigured()) return;
  const url = `${siteUrl()}${link}`;
  await Promise.allSettled(
    staff
      .filter((s) => s.email)
      .map((s) => sendMail({ to: s.email!, subject: `VENDO — новое объявление на модерации: ${title}`, text: `Новое объявление ждёт проверки:
«${title}»

Открыть: ${url}` })),
  );
}

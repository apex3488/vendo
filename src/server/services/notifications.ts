import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { notifications } from "../db/schema";

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
  | "store_verified";

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

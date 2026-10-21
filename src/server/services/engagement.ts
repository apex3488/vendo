import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { favorites, listingDailyStats, listings } from "../db/schema";
import { ServiceError } from "../errors";
import { getCards } from "./search";

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export async function toggleFavorite(userId: string, listingId: number): Promise<boolean> {
  const db = await getDb();
  const [l] = await db
    .select({ id: listings.id, status: listings.status })
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)));
  if (!l) throw new ServiceError("not_found");
  const removed = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
    .returning({ id: favorites.listingId });
  if (removed.length) {
    await db.update(listings).set({ favoritesCount: sql`greatest(${listings.favoritesCount} - 1, 0)` }).where(eq(listings.id, listingId));
    return false;
  }
  if (l.status !== "active") throw new ServiceError("not_found");
  await db.insert(favorites).values({ userId, listingId }).onConflictDoNothing();
  await db.update(listings).set({ favoritesCount: sql`${listings.favoritesCount} + 1` }).where(eq(listings.id, listingId));
  await trackEvent(listingId, "favorite");
  return true;
}

export async function getFavoriteCards(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: favorites.listingId, status: listings.status })
    .from(favorites)
    .innerJoin(listings, eq(listings.id, favorites.listingId))
    .where(and(eq(favorites.userId, userId), isNull(listings.deletedAt)))
    .orderBy(desc(favorites.createdAt));
  const cards = await getCards(rows.map((r) => r.id), userId);
  const status = new Map(rows.map((r) => [r.id, r.status]));
  return cards.map((c) => ({ ...c, status: status.get(c.id)! }));
}

export async function isFavorite(userId: string, listingId: number) {
  const db = await getDb();
  const [r] = await db.select({ id: favorites.listingId }).from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
  return !!r;
}

// ---------------------------------------------------------------------------
// Listing statistics (aggregated per day, no personal data)
// ---------------------------------------------------------------------------

export type TrackedEvent = "view" | "phone_reveal" | "call" | "telegram" | "favorite";
const COLUMN: Record<TrackedEvent, string> = {
  view: "views",
  phone_reveal: "phone_reveals",
  call: "call_clicks",
  telegram: "telegram_clicks",
  favorite: "favorites",
};

export async function trackEvent(listingId: number, event: TrackedEvent) {
  const db = await getDb();
  const col = sql.identifier(COLUMN[event]);
  await db.execute(sql`
    INSERT INTO listing_daily_stats (listing_id, day, ${col}) VALUES (${listingId}, current_date, 1)
    ON CONFLICT (listing_id, day) DO UPDATE SET ${col} = listing_daily_stats.${col} + 1`);
}

export async function getStatsForUser(userId: string, days = 30) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const ids = (await db.select({ id: listings.id }).from(listings).where(eq(listings.userId, userId))).map((r) => r.id);
  if (!ids.length) return { series: [], totals: { views: 0, phoneReveals: 0, callClicks: 0, telegramClicks: 0, favorites: 0 }, perListing: [] };
  const series = await db
    .select({
      day: listingDailyStats.day,
      views: sql<number>`sum(${listingDailyStats.views})::int`,
      phoneReveals: sql<number>`sum(${listingDailyStats.phoneReveals})::int`,
      callClicks: sql<number>`sum(${listingDailyStats.callClicks})::int`,
      telegramClicks: sql<number>`sum(${listingDailyStats.telegramClicks})::int`,
      favorites: sql<number>`sum(${listingDailyStats.favorites})::int`,
    })
    .from(listingDailyStats)
    .where(and(inArray(listingDailyStats.listingId, ids), gte(listingDailyStats.day, since)))
    .groupBy(listingDailyStats.day)
    .orderBy(asc(listingDailyStats.day));
  const perListing = await db
    .select({
      id: listings.id,
      title: listings.title,
      slug: listings.slug,
      status: listings.status,
      views: sql<number>`coalesce(sum(${listingDailyStats.views}), 0)::int`,
      contacts: sql<number>`coalesce(sum(${listingDailyStats.phoneReveals} + ${listingDailyStats.callClicks} + ${listingDailyStats.telegramClicks}), 0)::int`,
      favorites: sql<number>`coalesce(sum(${listingDailyStats.favorites}), 0)::int`,
    })
    .from(listings)
    .leftJoin(listingDailyStats, and(eq(listingDailyStats.listingId, listings.id), gte(listingDailyStats.day, since)))
    .where(and(eq(listings.userId, userId), isNull(listings.deletedAt)))
    .groupBy(listings.id)
    .orderBy(desc(sql`coalesce(sum(${listingDailyStats.views}), 0)`))
    .limit(50);
  const totals = series.reduce(
    (a, r) => ({
      views: a.views + Number(r.views),
      phoneReveals: a.phoneReveals + Number(r.phoneReveals),
      callClicks: a.callClicks + Number(r.callClicks),
      telegramClicks: a.telegramClicks + Number(r.telegramClicks),
      favorites: a.favorites + Number(r.favorites),
    }),
    { views: 0, phoneReveals: 0, callClicks: 0, telegramClicks: 0, favorites: 0 },
  );
  return { series, totals, perListing };
}

export async function getListingStats(listingId: number, sinceDay: string) {
  const db = await getDb();
  const [r] = await db
    .select({
      views: sql<number>`coalesce(sum(${listingDailyStats.views}), 0)::int`,
      contacts: sql<number>`coalesce(sum(${listingDailyStats.phoneReveals} + ${listingDailyStats.callClicks} + ${listingDailyStats.telegramClicks}), 0)::int`,
    })
    .from(listingDailyStats)
    .where(and(eq(listingDailyStats.listingId, listingId), gte(listingDailyStats.day, sinceDay)));
  return { views: Number(r?.views ?? 0), contacts: Number(r?.contacts ?? 0) };
}

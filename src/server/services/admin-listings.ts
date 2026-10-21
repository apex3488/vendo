import { and, count, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db";
import { categories, listings, users } from "../db/schema";
import type { ListingStatus } from "./listings";

export async function adminListListings(opts: { status?: string; q?: string; page: number; userId?: string }) {
  const db = await getDb();
  const perPage = 30;
  const conds: SQL[] = [isNull(listings.deletedAt)];
  const statuses = ["draft", "pending", "active", "rejected", "archived", "sold", "blocked"];
  if (opts.status && statuses.includes(opts.status)) conds.push(eq(listings.status, opts.status as ListingStatus));
  if (opts.userId) conds.push(eq(listings.userId, opts.userId));
  if (opts.q) {
    const q = opts.q.trim();
    conds.push(/^\d+$/.test(q) ? eq(listings.id, Number(q)) : or(ilike(listings.title, `%${q}%`), ilike(users.displayName, `%${q}%`))!);
  }
  const where = and(...conds);
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        status: listings.status,
        price: listings.price,
        currency: listings.currency,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        userId: users.id,
        userName: users.displayName,
        categoryName: categories.name,
        reports: sql<number>`(select count(*)::int from reports r where r.listing_id = ${listings.id} and r.status = 'open')`,
        thumbKey: sql<string | null>`(select thumb_key from listing_images li where li.listing_id = ${listings.id} order by li.sort, li.id limit 1)`,
      })
      .from(listings)
      .innerJoin(users, eq(users.id, listings.userId))
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .where(where)
      // Moderation queue: oldest first; other views: newest first.
      .orderBy(opts.status === "pending" ? listings.updatedAt : desc(listings.updatedAt))
      .limit(perPage)
      .offset((opts.page - 1) * perPage),
    db.select({ n: count() }).from(listings).innerJoin(users, eq(users.id, listings.userId)).where(where),
  ]);
  return { items, total: total?.n ?? 0, perPage };
}

/** The next listing in the moderation queue (oldest first), skipping the one just handled. */
export async function nextPendingListingId(excludeId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.status, "pending"), isNull(listings.deletedAt), ne(listings.id, excludeId)))
    .orderBy(listings.updatedAt)
    .limit(1);
  return row?.id ?? null;
}

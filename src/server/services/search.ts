import { and, asc, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db";
import { cities, favorites, listingImages, listings, searchQueries, stores, users } from "../db/schema";
import { getAllCategories, collectDescendants, getAttributesForCategory, type Attribute } from "./categories";

export const SORTS = ["relevance", "new", "price_asc", "price_desc", "popular"] as const;
export type Sort = (typeof SORTS)[number];

export type SearchParams = {
  q?: string;
  categorySlug?: string;
  categoryId?: number;
  regionId?: number;
  cityId?: number;
  type?: "sale" | "rent" | "service";
  condition?: string[];
  minPrice?: number;
  maxPrice?: number;
  currency?: "UZS" | "USD";
  postedWithinDays?: number;
  attrs?: Record<string, string[]>; // key -> option values, or ["min..max"] for numbers, ["1"] for booleans
  sort?: Sort;
  page?: number;
  perPage?: number;
  userId?: string;
  storeId?: number;
  excludeId?: number;
  featuredOnly?: boolean;
};

export type ListingCard = {
  id: number;
  slug: string;
  title: string;
  type: "sale" | "rent" | "service";
  price: number | null;
  priceMax: number | null;
  currency: string;
  pricePeriod: string | null;
  isNegotiable: boolean;
  condition: string | null;
  cityName: Record<string, string> | null;
  thumbKey: string | null;
  publishedAt: Date | null;
  highlighted: boolean;
  featured: boolean;
  isFavorite?: boolean;
};

/** Converts user text into a safe prefix tsquery: "iphone 13" -> "iphone:* & 13:*". */
export function toPrefixTsQuery(q: string): string | null {
  const tokens = q
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8)
    .map((t) => t.slice(0, 40));
  if (!tokens?.length) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

/** Builds WHERE conditions. All filtering happens in PostgreSQL. */
async function buildConditions(p: SearchParams, filterAttrs: Attribute[]): Promise<{ where: SQL; tsq: string | null }> {
  const conds: SQL[] = [eq(listings.status, "active"), isNull(listings.deletedAt)];
  let tsq: string | null = null;

  if (p.q?.trim()) {
    tsq = toPrefixTsQuery(p.q);
    const like = `%${p.q.trim().replace(/[\\%_]/g, (m) => "\\" + m).slice(0, 80)}%`;
    conds.push(
      tsq
        ? sql`(${listings.searchVector} @@ to_tsquery('simple', ${tsq}) OR ${listings.title} ILIKE ${like})`
        : sql`${listings.title} ILIKE ${like}`,
    );
  }
  if (p.categoryId || p.categorySlug) {
    const all = await getAllCategories();
    const cat = all.find((c) => (p.categoryId ? c.id === p.categoryId : c.slug === p.categorySlug));
    if (cat) conds.push(inArray(listings.categoryId, collectDescendants(all, cat.id, true)));
    else conds.push(sql`false`);
  }
  if (p.cityId) conds.push(eq(listings.cityId, p.cityId));
  else if (p.regionId) conds.push(sql`${listings.cityId} IN (SELECT id FROM cities WHERE region_id = ${p.regionId})`);
  if (p.type) conds.push(eq(listings.type, p.type));
  if (p.condition?.length) {
    const valid = p.condition.filter((c) => ["new", "like_new", "used", "for_parts"].includes(c)) as ("new" | "like_new" | "used" | "for_parts")[];
    if (valid.length) conds.push(inArray(listings.condition, valid));
  }
  if (p.minPrice != null || p.maxPrice != null) {
    conds.push(eq(listings.currency, p.currency ?? "UZS"));
    if (p.minPrice != null) conds.push(gte(listings.price, p.minPrice));
    if (p.maxPrice != null) conds.push(lte(listings.price, p.maxPrice));
  }
  if (p.postedWithinDays) conds.push(gte(listings.publishedAt, new Date(Date.now() - p.postedWithinDays * 86_400_000)));
  if (p.userId) conds.push(eq(listings.userId, p.userId));
  if (p.storeId) conds.push(eq(listings.storeId, p.storeId));
  if (p.excludeId) conds.push(sql`${listings.id} <> ${p.excludeId}`);
  if (p.featuredOnly) conds.push(sql`${listings.featuredUntil} > now()`);

  // Category-specific attribute filters
  if (p.attrs) {
    for (const a of filterAttrs) {
      const vals = p.attrs[a.key];
      if (!vals?.length) continue;
      if (a.type === "select" || a.type === "multiselect") {
        const ids = a.options.filter((o) => vals.includes(o.value)).map((o) => o.id);
        if (!ids.length) continue;
        conds.push(sql`EXISTS (SELECT 1 FROM listing_attribute_values v WHERE v.listing_id = ${listings.id} AND v.attribute_id = ${a.id} AND v.option_id IN ${ids})`);
      } else if (a.type === "number") {
        const [minS, maxS] = (vals[0] ?? "").split("..");
        const min = minS ? Number(minS) : null;
        const max = maxS ? Number(maxS) : null;
        if (min != null && Number.isFinite(min))
          conds.push(sql`EXISTS (SELECT 1 FROM listing_attribute_values v WHERE v.listing_id = ${listings.id} AND v.attribute_id = ${a.id} AND v.value_number >= ${min})`);
        if (max != null && Number.isFinite(max))
          conds.push(sql`EXISTS (SELECT 1 FROM listing_attribute_values v WHERE v.listing_id = ${listings.id} AND v.attribute_id = ${a.id} AND v.value_number <= ${max})`);
      } else if (a.type === "boolean" && vals[0] === "1") {
        conds.push(sql`EXISTS (SELECT 1 FROM listing_attribute_values v WHERE v.listing_id = ${listings.id} AND v.attribute_id = ${a.id} AND v.value_bool = true)`);
      }
    }
  }
  return { where: and(...conds)!, tsq };
}

function orderBy(sort: Sort, tsq: string | null): SQL[] {
  switch (sort) {
    case "price_asc":
      return [sql`${listings.price} ASC NULLS LAST`, desc(listings.id)];
    case "price_desc":
      return [sql`${listings.price} DESC NULLS LAST`, desc(listings.id)];
    case "popular":
      return [desc(listings.viewsCount), desc(listings.id)];
    case "relevance":
      if (tsq)
        return [sql`ts_rank(${listings.searchVector}, to_tsquery('simple', ${tsq})) DESC`, sql`${listings.rankedAt} DESC NULLS LAST`];
      return [sql`${listings.rankedAt} DESC NULLS LAST`, desc(listings.id)];
    case "new":
    default:
      return [sql`${listings.rankedAt} DESC NULLS LAST`, desc(listings.id)];
  }
}

export async function searchListings(p: SearchParams, viewerId?: string | null) {
  const db = await getDb();
  const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
  const page = Math.min(Math.max(p.page ?? 1, 1), 500);
  let filterAttrs: Attribute[] = [];
  if (p.attrs && (p.categorySlug || p.categoryId)) {
    const all = await getAllCategories();
    const cat = all.find((c) => (p.categoryId ? c.id === p.categoryId : c.slug === p.categorySlug));
    if (cat) filterAttrs = (await getAttributesForCategory(cat.id)).filter((a) => a.isFilterable);
  }
  const { where, tsq } = await buildConditions(p, filterAttrs);
  const sort = p.sort ?? (p.q ? "relevance" : "new");

  const [idRows, totalRows] = await Promise.all([
    db
      .select({ id: listings.id })
      .from(listings)
      .where(where)
      .orderBy(...orderBy(sort, tsq))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ n: sql<number>`count(*)::int` }).from(listings).where(where),
  ]);
  const items = await getCards(idRows.map((r) => r.id), viewerId);
  const total = Number(totalRows[0]?.n ?? 0);
  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Hydrates listing ids into card data, preserving order. */
export async function getCards(ids: number[], viewerId?: string | null): Promise<ListingCard[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      type: listings.type,
      price: listings.price,
      priceMax: listings.priceMax,
      currency: listings.currency,
      pricePeriod: listings.pricePeriod,
      isNegotiable: listings.isNegotiable,
      condition: listings.condition,
      cityName: cities.name,
      publishedAt: listings.publishedAt,
      highlighted: sql<boolean>`coalesce(${listings.highlightUntil} > now(), false)`,
      featured: sql<boolean>`coalesce(${listings.featuredUntil} > now(), false)`,
    })
    .from(listings)
    .leftJoin(cities, eq(cities.id, listings.cityId))
    .where(inArray(listings.id, ids));
  const imgs = await db
    .select({ listingId: listingImages.listingId, thumbKey: listingImages.thumbKey })
    .from(listingImages)
    .where(inArray(listingImages.listingId, ids))
    .orderBy(asc(listingImages.sort), asc(listingImages.id));
  const firstImg = new Map<number, string>();
  for (const i of imgs) if (!firstImg.has(i.listingId)) firstImg.set(i.listingId, i.thumbKey);
  let favSet = new Set<number>();
  if (viewerId) {
    const favs = await db
      .select({ id: favorites.listingId })
      .from(favorites)
      .where(and(eq(favorites.userId, viewerId), inArray(favorites.listingId, ids)));
    favSet = new Set(favs.map((f) => f.id));
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      ...r,
      cityName: r.cityName as Record<string, string> | null,
      thumbKey: firstImg.get(r.id) ?? null,
      highlighted: !!r.highlighted,
      featured: !!r.featured,
      isFavorite: viewerId ? favSet.has(r.id) : undefined,
    }));
}

/** Search suggestions from real listing titles and real past queries. */
export async function suggest(q: string, limit = 8) {
  const term = q.trim().toLowerCase().slice(0, 60);
  if (term.length < 2) return [];
  const db = await getDb();
  const like = `${term.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
  const fromQueries = await db
    .select({ text: searchQueries.query })
    .from(searchQueries)
    .where(sql`${searchQueries.query} LIKE ${like} AND ${searchQueries.count} >= 2`)
    .orderBy(desc(searchQueries.count))
    .limit(limit);
  const fromTitles = await db
    .select({ text: listings.title })
    .from(listings)
    .where(and(eq(listings.status, "active"), sql`${listings.title} ILIKE ${"%" + like}`))
    .orderBy(desc(listings.viewsCount))
    .limit(limit);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [...fromQueries, ...fromTitles]) {
    const key = r.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r.text);
    }
    if (out.length >= limit) break;
  }
  return out;
}

export async function recordSearchQuery(q: string) {
  const term = q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (term.length < 2) return;
  const db = await getDb();
  await db
    .insert(searchQueries)
    .values({ query: term })
    .onConflictDoUpdate({ target: searchQueries.query, set: { count: sql`${searchQueries.count} + 1`, lastSearchedAt: new Date() } });
}

/** Popular queries that were actually searched by several people recently. */
export async function popularQueries(limit = 8) {
  const db = await getDb();
  const rows = await db
    .select({ text: searchQueries.query })
    .from(searchQueries)
    .where(sql`${searchQueries.count} >= 3 AND ${searchQueries.lastSearchedAt} > now() - interval '30 days'`)
    .orderBy(desc(searchQueries.count))
    .limit(limit);
  return rows.map((r) => r.text);
}

export async function getSellerSummary(userId: string) {
  const db = await getDb();
  const [u] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      createdAt: users.createdAt,
      storeSlug: stores.slug,
      storeName: stores.name,
      storeLogo: stores.logoKey,
      storeVerifiedAt: stores.verifiedAt,
      storeStatus: stores.status,
      activeCount: sql<number>`(select count(*)::int from listings l where l.user_id = ${users.id} and l.status = 'active' and l.deleted_at is null)`,
    })
    .from(users)
    .leftJoin(stores, eq(stores.ownerId, users.id))
    .where(eq(users.id, userId));
  return u ?? null;
}

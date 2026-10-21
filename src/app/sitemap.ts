import type { MetadataRoute } from "next";
import { and, desc, eq, isNull } from "drizzle-orm";
import { listingPath } from "@/lib/slug";
import { siteUrl } from "@/lib/site";
import { getDb } from "@/server/db";
import { contentPages, listings, stores } from "@/server/db/schema";
import { getAllCategories } from "@/server/services/categories";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Public, indexable pages only. Account, admin and search permutations are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const db = await getDb();
  const [cats, pages, items, storeRows] = await Promise.all([
    getAllCategories(),
    db.select({ slug: contentPages.slug, updatedAt: contentPages.updatedAt }).from(contentPages).where(and(eq(contentPages.isPublished, true), eq(contentPages.kind, "page"))),
    db
      .select({ id: listings.id, slug: listings.slug, updatedAt: listings.updatedAt })
      .from(listings)
      .where(and(eq(listings.status, "active"), isNull(listings.deletedAt)))
      .orderBy(desc(listings.updatedAt))
      .limit(45000),
    db.select({ slug: stores.slug, updatedAt: stores.updatedAt }).from(stores).where(eq(stores.status, "active")),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/plans`, changeFrequency: "monthly", priority: 0.3 },
    ...cats.filter((c) => c.isActive).map((c) => ({ url: `${base}/c/${c.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...pages.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
    ...storeRows.map((s) => ({ url: `${base}/store/${s.slug}`, lastModified: s.updatedAt, priority: 0.5 })),
    ...items.map((l) => ({ url: `${base}${listingPath(l)}`, lastModified: l.updatedAt, priority: 0.6 })),
  ];
}

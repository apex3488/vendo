import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { contentPages, homeCollections } from "../db/schema";
import { ServiceError } from "../errors";

export async function getPage(slug: string) {
  const db = await getDb();
  const [p] = await db.select().from(contentPages).where(eq(contentPages.slug, slug));
  return p && p.isPublished ? p : null;
}

export async function listPages(kind?: string) {
  const db = await getDb();
  return db
    .select()
    .from(contentPages)
    .where(kind ? eq(contentPages.kind, kind) : undefined)
    .orderBy(asc(contentPages.sort), asc(contentPages.id));
}

const i18n = z.object({ ru: z.string().max(20000), uz: z.string().max(20000).optional(), en: z.string().max(20000).optional() });

export const pageSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  kind: z.enum(["page", "faq"]),
  title: i18n.refine((v) => v.ru.trim().length > 0, { path: ["ru"] }),
  body: i18n,
  isPublished: z.boolean(),
  sort: z.number().int().default(0),
});

export async function upsertPage(id: number | null, input: z.input<typeof pageSchema>) {
  const data = pageSchema.parse(input);
  const db = await getDb();
  const [dup] = await db.select({ id: contentPages.id }).from(contentPages).where(eq(contentPages.slug, data.slug));
  if (dup && dup.id !== id) throw new ServiceError("slug_taken", "slug");
  const [row] = id
    ? await db.update(contentPages).set({ ...data, updatedAt: new Date() }).where(eq(contentPages.id, id)).returning()
    : await db.insert(contentPages).values(data).returning();
  if (!row) throw new ServiceError("not_found");
  return row;
}

export async function deletePage(id: number) {
  const db = await getDb();
  await db.delete(contentPages).where(eq(contentPages.id, id));
}

export async function getHomeCollections(activeOnly = true) {
  const db = await getDb();
  return db
    .select()
    .from(homeCollections)
    .where(activeOnly ? eq(homeCollections.isActive, true) : undefined)
    .orderBy(asc(homeCollections.sort), asc(homeCollections.id));
}

export const collectionSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/),
  title: z.object({ ru: z.string().trim().min(1).max(120), uz: z.string().trim().max(120).optional(), en: z.string().trim().max(120).optional() }),
  filter: z.object({
    categorySlug: z.string().trim().max(100).optional(),
    type: z.enum(["sale", "rent", "service"]).optional(),
    sort: z.enum(["new", "price_asc", "price_desc", "popular"]).optional(),
    maxPrice: z.number().positive().optional(),
    q: z.string().trim().max(80).optional(),
  }),
  isActive: z.boolean(),
  sort: z.number().int().default(0),
});

export async function upsertCollection(id: number | null, input: z.input<typeof collectionSchema>) {
  const data = collectionSchema.parse(input);
  const db = await getDb();
  const [row] = id
    ? await db.update(homeCollections).set(data).where(eq(homeCollections.id, id)).returning()
    : await db.insert(homeCollections).values(data).returning();
  if (!row) throw new ServiceError("not_found");
  return row;
}

export async function deleteCollection(id: number) {
  const db = await getDb();
  await db.delete(homeCollections).where(eq(homeCollections.id, id));
}

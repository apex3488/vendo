import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { getDb } from "../db";
import {
  categories,
  categoryAttributeOptions,
  categoryAttributes,
  listings,
  type I18nText,
} from "../db/schema";
import { ServiceError } from "../errors";

export type Category = typeof categories.$inferSelect;
export type CategoryNode = Category & { children: CategoryNode[] };
export type AttributeOption = { id: number; value: string; label: I18nText; sort: number };
export type Attribute = typeof categoryAttributes.$inferSelect & { options: AttributeOption[] };

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
}

export function buildTree(rows: Category[], activeOnly: boolean): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>();
  for (const r of rows) if (!activeOnly || r.isActive) nodes.set(r.id, { ...r, children: [] });
  const roots: CategoryNode[] = [];
  for (const n of nodes.values()) {
    if (n.parentId == null) roots.push(n);
    else nodes.get(n.parentId)?.children.push(n);
    // Children of an inactive parent are hidden together with it.
  }
  return roots;
}

export async function getCategoryTree(activeOnly = true) {
  return buildTree(await getAllCategories(), activeOnly);
}

/** The category, its ancestors (root first) and all active descendant ids. */
export async function getCategoryContext(slug: string) {
  const all = await getAllCategories();
  const cat = all.find((c) => c.slug === slug && c.isActive);
  if (!cat) return null;
  const byId = new Map(all.map((c) => [c.id, c]));
  const ancestors: Category[] = [];
  let p = cat.parentId;
  while (p != null) {
    const parent = byId.get(p);
    if (!parent) break;
    if (!parent.isActive) return null;
    ancestors.unshift(parent);
    p = parent.parentId;
  }
  const descendantIds = collectDescendants(all, cat.id, true);
  const children = all.filter((c) => c.parentId === cat.id && c.isActive);
  return { category: cat, ancestors, descendantIds, children };
}

export function collectDescendants(all: Category[], rootId: number, activeOnly: boolean): number[] {
  const ids = [rootId];
  for (let i = 0; i < ids.length; i++) {
    for (const c of all) if (c.parentId === ids[i] && (!activeOnly || c.isActive)) ids.push(c.id);
  }
  return ids;
}

export async function getCategoryWithAncestors(categoryId: number) {
  const all = await getAllCategories();
  const byId = new Map(all.map((c) => [c.id, c]));
  const chain: Category[] = [];
  let cur = byId.get(categoryId);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

/** Attributes of a category including those inherited from its ancestors. */
export async function getAttributesForCategory(categoryId: number): Promise<Attribute[]> {
  const chain = await getCategoryWithAncestors(categoryId);
  if (!chain.length) return [];
  const db = await getDb();
  const ids = chain.map((c) => c.id);
  const attrs = await db
    .select()
    .from(categoryAttributes)
    .where(inArray(categoryAttributes.categoryId, ids))
    .orderBy(asc(categoryAttributes.sort), asc(categoryAttributes.id));
  if (!attrs.length) return [];
  const opts = await db
    .select()
    .from(categoryAttributeOptions)
    .where(inArray(categoryAttributeOptions.attributeId, attrs.map((a) => a.id)))
    .orderBy(asc(categoryAttributeOptions.sort), asc(categoryAttributeOptions.id));
  // Order: ancestors' attributes first, then own.
  const depth = new Map(ids.map((id, i) => [id, i]));
  return attrs
    .sort((a, b) => depth.get(a.categoryId)! - depth.get(b.categoryId)! || a.sort - b.sort)
    .map((a) => ({
      ...a,
      options: opts.filter((o) => o.attributeId === a.id).map(({ id, value, label, sort }) => ({ id, value, label, sort })),
    }));
}

/** Category is a leaf (listings may only be posted into leaves when children exist). */
export async function isLeafCategory(categoryId: number) {
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(categories).where(and(eq(categories.parentId, categoryId), eq(categories.isActive, true)));
  return (r?.n ?? 0) === 0;
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

const i18nSchema = z.object({ ru: z.string().trim().max(200), uz: z.string().trim().max(200).optional(), en: z.string().trim().max(200).optional() });

export const categoryInputSchema = z.object({
  parentId: z.number().int().positive().nullable(),
  slug: z.string().trim().max(100).optional(),
  name: i18nSchema.refine((v) => v.ru.length >= 2, { path: ["ru"] }),
  icon: z.string().trim().max(40).optional().nullable(),
  sort: z.number().int().min(-1000).max(100000).default(0),
  isActive: z.boolean().default(true),
  allowedTypes: z.array(z.enum(["sale", "rent", "service"])).min(1),
  hasCondition: z.boolean().default(true),
  highValue: z.boolean().default(false),
  seoTitle: i18nSchema.partial().optional().nullable(),
  seoDescription: i18nSchema.partial().optional().nullable(),
});

async function assertValidParent(id: number | null, parentId: number | null) {
  if (parentId == null) return;
  const all = await getAllCategories();
  if (!all.some((c) => c.id === parentId)) throw new ServiceError("category_invalid_parent", "parentId");
  if (id != null && collectDescendants(all, id, false).includes(parentId)) {
    throw new ServiceError("category_invalid_parent", "parentId");
  }
}

export async function createCategory(input: z.input<typeof categoryInputSchema>) {
  const data = categoryInputSchema.parse(input);
  await assertValidParent(null, data.parentId);
  const db = await getDb();
  const slug = slugify(data.slug || data.name.en || data.name.ru);
  const [exists] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  if (exists) throw new ServiceError("slug_taken", "slug");
  const [row] = await db.insert(categories).values({ ...data, slug }).returning();
  return row!;
}

export async function updateCategory(id: number, input: z.input<typeof categoryInputSchema>) {
  const data = categoryInputSchema.parse(input);
  await assertValidParent(id, data.parentId);
  const db = await getDb();
  const slug = slugify(data.slug || data.name.en || data.name.ru);
  const [exists] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  if (exists && exists.id !== id) throw new ServiceError("slug_taken", "slug");
  const [row] = await db.update(categories).set({ ...data, slug, updatedAt: new Date() }).where(eq(categories.id, id)).returning();
  if (!row) throw new ServiceError("not_found");
  return row;
}

/**
 * Deletes a category safely:
 *  - refuses when it has subcategories;
 *  - if it has listings, they must be moved to `moveListingsTo` first (in one transaction).
 */
export async function deleteCategory(id: number, moveListingsTo?: number | null) {
  const db = await getDb();
  const [children] = await db.select({ n: count() }).from(categories).where(eq(categories.parentId, id));
  if ((children?.n ?? 0) > 0) throw new ServiceError("category_has_children");
  const [used] = await db.select({ n: count() }).from(listings).where(eq(listings.categoryId, id));
  const n = used?.n ?? 0;
  if (n > 0 && !moveListingsTo) throw new ServiceError("category_has_listings", undefined, String(n));
  await db.transaction(async (tx) => {
    if (n > 0 && moveListingsTo) {
      if (moveListingsTo === id) throw new ServiceError("category_invalid_parent");
      const [target] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, moveListingsTo));
      if (!target) throw new ServiceError("not_found");
      // Attribute values tied to the old category's own attributes are removed with them (cascade).
      await tx.update(listings).set({ categoryId: moveListingsTo, updatedAt: new Date() }).where(eq(listings.categoryId, id));
    }
    await tx.delete(categories).where(eq(categories.id, id));
  });
  return { moved: n };
}

export const attributeInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: i18nSchema.refine((v) => v.ru.length >= 1, { path: ["ru"] }),
  type: z.enum(["text", "number", "select", "multiselect", "boolean", "date"]),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  unit: z.string().trim().max(20).optional().nullable(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  maxLength: z.number().int().positive().max(2000).optional().nullable(),
  sort: z.number().int().default(0),
});

export async function createAttribute(categoryId: number, input: z.input<typeof attributeInputSchema>) {
  const data = attributeInputSchema.parse(input);
  const db = await getDb();
  const [row] = await db.insert(categoryAttributes).values({ ...data, categoryId }).returning();
  return row!;
}

export async function updateAttribute(id: number, input: z.input<typeof attributeInputSchema>) {
  const data = attributeInputSchema.parse(input);
  const db = await getDb();
  const [row] = await db.update(categoryAttributes).set(data).where(eq(categoryAttributes.id, id)).returning();
  if (!row) throw new ServiceError("not_found");
  return row;
}

export async function deleteAttribute(id: number) {
  const db = await getDb();
  await db.delete(categoryAttributes).where(eq(categoryAttributes.id, id));
}

export const optionInputSchema = z.object({
  value: z.string().trim().max(80).optional(),
  label: i18nSchema.refine((v) => v.ru.length >= 1, { path: ["ru"] }),
  sort: z.number().int().default(0),
});

export async function createOption(attributeId: number, input: z.input<typeof optionInputSchema>) {
  const data = optionInputSchema.parse(input);
  const db = await getDb();
  const value = slugify(data.value || data.label.en || data.label.ru, 80);
  const [row] = await db.insert(categoryAttributeOptions).values({ attributeId, value, label: data.label, sort: data.sort }).returning();
  return row!;
}

export async function deleteOption(id: number) {
  const db = await getDb();
  await db.delete(categoryAttributeOptions).where(eq(categoryAttributeOptions.id, id));
}

export async function getRootCategories() {
  const db = await getDb();
  return db
    .select()
    .from(categories)
    .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
    .orderBy(asc(categories.sort));
}

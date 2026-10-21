import { and, asc, count, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizePhone, normalizeTelegram } from "@/lib/contacts";
import { slugify } from "@/lib/slug";
import { getDb } from "../db";
import {
  categories,
  categoryAttributeOptions,
  categoryAttributes,
  listingAttributeValues,
  listingImages,
  listings,
  listingStatusHistory,
  stores,
  storeSubscriptions,
  subscriptionPlans,
  users,
} from "../db/schema";
import { can, type Role } from "../auth/permissions";
import { ServiceError } from "../errors";
import { audit } from "./audit";
import { getAttributesForCategory, isLeafCategory, type Attribute } from "./categories";
import { notify } from "./notifications";
import { enforce } from "./rate-limit";
import { getSettings } from "./settings";

export type ListingStatus = (typeof listings.$inferSelect)["status"];
export type ListingRow = typeof listings.$inferSelect;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v.replace(/\s/g, "").replace(",", ".")) : v),
  z.number().finite().min(0).max(1e13).nullable(),
);

export const listingInputSchema = z.object({
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  type: z.enum(["sale", "rent", "service"]).default("sale"),
  title: z.string().trim().max(120).default(""),
  description: z.string().trim().max(5000).default(""),
  price: optionalNumber.optional(),
  priceMax: optionalNumber.optional(),
  currency: z.enum(["UZS", "USD"]).default("UZS"),
  pricePeriod: z.enum(["hour", "day", "week", "month"]).nullable().optional(),
  deposit: optionalNumber.optional(),
  isNegotiable: z.boolean().default(false),
  condition: z.enum(["new", "like_new", "used", "for_parts"]).nullable().optional(),
  cityId: z.coerce.number().int().positive().nullable().optional(),
  phone: z.string().trim().max(30).default(""),
  telegram: z.string().trim().max(60).default(""),
  hidePhone: z.boolean().default(true),
  attributes: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.boolean(), z.number(), z.null()])).default({}),
});
export type ListingInput = z.input<typeof listingInputSchema>;

type AttrRow = Omit<typeof listingAttributeValues.$inferInsert, "listingId">;

/** Validates attribute values against the category configuration. */
export function validateAttributes(
  attrs: Attribute[],
  values: Record<string, unknown>,
  requireAll: boolean,
): { rows: AttrRow[]; errors: Record<string, string> } {
  const rows: AttrRow[] = [];
  const errors: Record<string, string> = {};
  for (const a of attrs) {
    const raw = values[a.key];
    const empty = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);
    if (empty) {
      if (requireAll && a.isRequired && a.type !== "boolean") errors[a.key] = "required";
      continue;
    }
    switch (a.type) {
      case "text": {
        const s = String(raw).trim();
        if (s.length > (a.maxLength ?? 200)) errors[a.key] = "too_long";
        else if (s) rows.push({ attributeId: a.id, valueText: s });
        break;
      }
      case "number": {
        const n = typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", "."));
        if (!Number.isFinite(n)) errors[a.key] = "invalid";
        else if (a.minValue != null && n < a.minValue) errors[a.key] = "too_small";
        else if (a.maxValue != null && n > a.maxValue) errors[a.key] = "too_large";
        else rows.push({ attributeId: a.id, valueNumber: n });
        break;
      }
      case "select": {
        const opt = a.options.find((o) => o.value === String(raw));
        if (!opt) errors[a.key] = "invalid";
        else rows.push({ attributeId: a.id, optionId: opt.id });
        break;
      }
      case "multiselect": {
        const list = (Array.isArray(raw) ? raw : [raw]).map(String);
        const opts = list.map((v) => a.options.find((o) => o.value === v));
        if (opts.some((o) => !o)) errors[a.key] = "invalid";
        else for (const o of new Set(opts)) rows.push({ attributeId: a.id, optionId: o!.id });
        break;
      }
      case "boolean": {
        const b = raw === true || raw === "true" || raw === "on" || raw === "1";
        if (b) rows.push({ attributeId: a.id, valueBool: true });
        break;
      }
      case "date": {
        const s = String(raw);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) errors[a.key] = "invalid";
        else rows.push({ attributeId: a.id, valueDate: s });
        break;
      }
    }
  }
  return { rows, errors };
}

export class ListingValidationError extends ServiceError {
  constructor(public fieldErrors: Record<string, string>) {
    super("invalid_input", Object.keys(fieldErrors)[0]);
  }
}

// ---------------------------------------------------------------------------
// Ownership helpers
// ---------------------------------------------------------------------------

export async function getOwnedListing(listingId: number, userId: string) {
  const db = await getDb();
  const [l] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1);
  // Same error for "missing" and "not yours": do not leak existence.
  if (!l || l.userId !== userId) throw new ServiceError("not_found");
  return l;
}

async function recordStatus(listingId: number, from: ListingStatus | null, to: ListingStatus, actorId: string | null, reason?: string | null) {
  const db = await getDb();
  await db.insert(listingStatusHistory).values({ listingId, fromStatus: from, toStatus: to, actorId, reason: reason ?? null });
}

/** Active-listing limit for a user: store plan limit if subscribed, otherwise the free limit. */
export async function getListingLimit(userId: string) {
  const db = await getDb();
  const settings = await getSettings();
  const [sub] = await db
    .select({ limit: subscriptionPlans.listingLimit })
    .from(storeSubscriptions)
    .innerJoin(stores, eq(stores.id, storeSubscriptions.storeId))
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, storeSubscriptions.planId))
    .where(
      and(
        eq(stores.ownerId, userId),
        eq(stores.status, "active"),
        eq(storeSubscriptions.status, "active"),
        sql`${storeSubscriptions.endsAt} > now()`,
      ),
    )
    .orderBy(desc(subscriptionPlans.listingLimit))
    .limit(1);
  return Math.max(settings.freeActiveListings, sub?.limit ?? 0);
}

async function countLiveListings(userId: string, excludeId?: number) {
  const db = await getDb();
  const conds = [eq(listings.userId, userId), inArray(listings.status, ["pending", "active"]), isNull(listings.deletedAt)];
  if (excludeId) conds.push(ne(listings.id, excludeId));
  const [r] = await db.select({ n: count() }).from(listings).where(and(...conds));
  return r?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

/**
 * Saves a listing (create when id is null). With `submit: true` the full validation runs and
 * the listing goes to moderation (or straight to "active" when premoderation is disabled).
 */
export async function saveListing(
  userId: string,
  id: number | null,
  input: ListingInput,
  opts: { submit: boolean },
): Promise<{ id: number; status: ListingStatus }> {
  const data = listingInputSchema.parse(input);
  const db = await getDb();
  const settings = await getSettings();
  const errors: Record<string, string> = {};
  const existing = id ? await getOwnedListing(id, userId) : null;
  if (existing && existing.status === "blocked") throw new ServiceError("forbidden");

  // Category and type
  let attrRows: AttrRow[] = [];
  let category: typeof categories.$inferSelect | undefined;
  if (data.categoryId) {
    [category] = await db.select().from(categories).where(eq(categories.id, data.categoryId));
    if (!category || !category.isActive) errors.categoryId = "invalid";
    else if (!(await isLeafCategory(category.id))) errors.categoryId = "not_leaf";
    else if (!category.allowedTypes.includes(data.type)) errors.type = "invalid";
    if (category && !errors.categoryId) {
      const attrs = await getAttributesForCategory(category.id);
      const res = validateAttributes(attrs, data.attributes, opts.submit);
      attrRows = res.rows;
      for (const [k, v] of Object.entries(res.errors)) errors[`attr.${k}`] = v;
    }
  } else if (opts.submit) errors.categoryId = "required";

  // Contacts: stored only in normalized, safe form
  const phone = data.phone ? normalizePhone(data.phone) : null;
  if (data.phone && !phone) errors.phone = "invalid";
  const telegram = data.telegram ? normalizeTelegram(data.telegram) : null;
  if (data.telegram && !telegram) errors.telegram = "invalid";

  if (opts.submit) {
    if (data.title.length < 5) errors.title = "too_short";
    if (data.description.length < 20) errors.description = "too_short";
    if (!data.cityId) errors.cityId = "required";
    if (!phone && !telegram && !errors.phone && !errors.telegram) errors.phone = "contact_required";
    if (data.type !== "service" && data.price == null && !data.isNegotiable) errors.price = "required";
    if (data.type === "rent" && data.price != null && !data.pricePeriod) errors.pricePeriod = "required";
    if (data.priceMax != null && data.price != null && data.priceMax < data.price) errors.priceMax = "invalid";
    if (category?.hasCondition && data.type === "sale" && !data.condition) errors.condition = "required";
  }
  if (Object.keys(errors).length) throw new ListingValidationError(errors);

  const values = {
    categoryId: category?.id ?? existing?.categoryId ?? null,
    type: data.type,
    title: data.title,
    slug: slugify(data.title || "draft", 120),
    description: data.description,
    price: data.price ?? null,
    priceMax: data.type === "service" ? (data.priceMax ?? null) : null,
    currency: data.currency,
    pricePeriod: data.type === "rent" ? (data.pricePeriod ?? null) : null,
    deposit: data.type === "rent" ? (data.deposit ?? null) : null,
    isNegotiable: data.isNegotiable,
    condition: category?.hasCondition && data.type !== "service" ? (data.condition ?? null) : null,
    cityId: data.cityId ?? null,
    phone,
    telegram,
    hidePhone: data.hidePhone,
    updatedAt: new Date(),
  };

  let nextStatus: ListingStatus = existing?.status ?? "draft";
  if (opts.submit) {
    if (!existing || ["draft", "rejected", "archived", "sold"].includes(existing.status)) {
      const isNewSubmission = !existing || existing.status === "draft";
      if (isNewSubmission) {
        await enforce(`listing-submit:${userId}`, settings.listingsPerDay, 86_400);
      }
      if ((await countLiveListings(userId, existing?.id)) >= (await getListingLimit(userId))) {
        throw new ServiceError("listing_limit");
      }
    }
    nextStatus = settings.premoderation ? "pending" : "active";
  }

  if (!values.categoryId) {
    // Drafts may be saved before a category is chosen: use the first root category as placeholder.
    const [first] = await db.select({ id: categories.id }).from(categories).orderBy(asc(categories.sort)).limit(1);
    if (!first) throw new ServiceError("invalid_input", "categoryId");
    values.categoryId = first.id;
  }

  // Store association: listings of a store owner appear in the store catalog.
  const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, userId));

  const listingId = await db.transaction(async (tx) => {
    let lid: number;
    const statusFields =
      nextStatus === "active" && existing?.status !== "active"
        ? { status: nextStatus, publishedAt: existing?.publishedAt ?? new Date(), rankedAt: new Date(), rejectionReason: null }
        : { status: nextStatus, ...(nextStatus === "pending" ? { rejectionReason: null } : {}) };
    if (existing) {
      await tx
        .update(listings)
        .set({ ...values, categoryId: values.categoryId!, storeId: store?.id ?? null, ...statusFields })
        .where(eq(listings.id, existing.id));
      lid = existing.id;
    } else {
      const [row] = await tx
        .insert(listings)
        .values({ ...values, categoryId: values.categoryId!, userId, storeId: store?.id ?? null, ...statusFields })
        .returning({ id: listings.id });
      lid = row!.id;
    }
    if (category) {
      await tx.delete(listingAttributeValues).where(eq(listingAttributeValues.listingId, lid));
      if (attrRows.length) await tx.insert(listingAttributeValues).values(attrRows.map((r) => ({ ...r, listingId: lid })));
    }
    return lid;
  });

  if (nextStatus !== (existing?.status ?? null)) {
    await recordStatus(listingId, existing?.status ?? null, nextStatus, userId);
  }
  return { id: listingId, status: nextStatus };
}

// ---------------------------------------------------------------------------
// Owner actions
// ---------------------------------------------------------------------------

export type OwnerAction = "archive" | "mark_sold" | "republish" | "delete";

export async function ownerSetStatus(userId: string, listingId: number, action: OwnerAction) {
  const l = await getOwnedListing(listingId, userId);
  const db = await getDb();
  if (l.status === "blocked") throw new ServiceError("forbidden");
  let to: ListingStatus;
  switch (action) {
    case "archive":
      if (!["active", "pending", "rejected", "sold"].includes(l.status)) throw new ServiceError("invalid_status");
      to = "archived";
      break;
    case "mark_sold":
      if (l.status !== "active") throw new ServiceError("invalid_status");
      to = "sold";
      break;
    case "republish": {
      if (!["archived", "sold"].includes(l.status)) throw new ServiceError("invalid_status");
      if ((await countLiveListings(userId, l.id)) >= (await getListingLimit(userId))) throw new ServiceError("listing_limit");
      const settings = await getSettings();
      to = settings.premoderation ? "pending" : "active";
      break;
    }
    case "delete":
      await db.update(listings).set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() }).where(eq(listings.id, l.id));
      await recordStatus(l.id, l.status, "archived", userId, "deleted_by_owner");
      return;
  }
  await db
    .update(listings)
    .set({
      status: to,
      updatedAt: new Date(),
      ...(to === "active" ? { rankedAt: new Date(), publishedAt: new Date() } : {}),
    })
    .where(eq(listings.id, l.id));
  await recordStatus(l.id, l.status, to, userId);
}

// ---------------------------------------------------------------------------
// Moderation (staff)
// ---------------------------------------------------------------------------

export type ModerationDecision = "approve" | "reject" | "block" | "unpublish";

export async function moderateListing(actor: { id: string; role: Role }, listingId: number, decision: ModerationDecision, reason?: string) {
  if (!can(actor.role, "listings.moderate")) {
    await audit({ actorId: actor.id, action: `listing.${decision}`, entityType: "listing", entityId: listingId, result: "denied" });
    throw new ServiceError("forbidden");
  }
  const db = await getDb();
  const [l] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!l || l.deletedAt) throw new ServiceError("not_found");
  const cleanReason = reason?.trim().slice(0, 1000) || null;
  if ((decision === "reject" || decision === "block") && !cleanReason) throw new ServiceError("invalid_input", "reason");

  let to: ListingStatus;
  if (decision === "approve") {
    if (!["pending", "rejected", "blocked"].includes(l.status)) throw new ServiceError("invalid_status");
    to = "active";
  } else if (decision === "reject") {
    if (!["pending", "active"].includes(l.status)) throw new ServiceError("invalid_status");
    to = "rejected";
  } else if (decision === "unpublish") {
    if (l.status !== "active") throw new ServiceError("invalid_status");
    to = "archived";
  } else to = "blocked";

  await db
    .update(listings)
    .set({
      status: to,
      rejectionReason: to === "rejected" || to === "blocked" ? cleanReason : null,
      updatedAt: new Date(),
      ...(to === "active" ? { publishedAt: l.publishedAt ?? new Date(), rankedAt: l.rankedAt && l.publishedAt ? l.rankedAt : new Date() } : {}),
    })
    .where(eq(listings.id, listingId));
  await recordStatus(listingId, l.status, to, actor.id, cleanReason);
  await audit({ actorId: actor.id, action: `listing.${decision}`, entityType: "listing", entityId: listingId, meta: { from: l.status, to, reason: cleanReason } });
  const type = to === "active" ? "listing_approved" : to === "rejected" ? "listing_rejected" : to === "blocked" ? "listing_blocked" : "listing_unpublished";
  await notify(l.userId, type, { title: l.title, reason: cleanReason ?? "" }, `/account/listings?status=${to}`);
}

export async function getStatusHistory(listingId: number) {
  const db = await getDb();
  return db
    .select({
      id: listingStatusHistory.id,
      fromStatus: listingStatusHistory.fromStatus,
      toStatus: listingStatusHistory.toStatus,
      reason: listingStatusHistory.reason,
      createdAt: listingStatusHistory.createdAt,
      actorName: users.displayName,
    })
    .from(listingStatusHistory)
    .leftJoin(users, eq(users.id, listingStatusHistory.actorId))
    .where(eq(listingStatusHistory.listingId, listingId))
    .orderBy(desc(listingStatusHistory.createdAt));
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function getListingAttributesView(listingId: number) {
  const db = await getDb();
  return db
    .select({
      attributeId: categoryAttributes.id,
      key: categoryAttributes.key,
      label: categoryAttributes.label,
      type: categoryAttributes.type,
      unit: categoryAttributes.unit,
      sort: categoryAttributes.sort,
      valueText: listingAttributeValues.valueText,
      valueNumber: listingAttributeValues.valueNumber,
      valueBool: listingAttributeValues.valueBool,
      valueDate: listingAttributeValues.valueDate,
      optionValue: categoryAttributeOptions.value,
      optionLabel: categoryAttributeOptions.label,
    })
    .from(listingAttributeValues)
    .innerJoin(categoryAttributes, eq(categoryAttributes.id, listingAttributeValues.attributeId))
    .leftJoin(categoryAttributeOptions, eq(categoryAttributeOptions.id, listingAttributeValues.optionId))
    .where(eq(listingAttributeValues.listingId, listingId))
    .orderBy(asc(categoryAttributes.sort), asc(categoryAttributes.id));
}

/** Attribute values in form shape: { key: value | values[] }. */
export async function getListingAttributeForm(listingId: number) {
  const rows = await getListingAttributesView(listingId);
  const out: Record<string, string | string[] | boolean> = {};
  for (const r of rows) {
    if (r.type === "multiselect") out[r.key] = [...((out[r.key] as string[]) ?? []), r.optionValue!];
    else if (r.type === "select") out[r.key] = r.optionValue ?? "";
    else if (r.type === "boolean") out[r.key] = !!r.valueBool;
    else if (r.type === "number") out[r.key] = r.valueNumber != null ? String(r.valueNumber) : "";
    else if (r.type === "date") out[r.key] = r.valueDate ?? "";
    else out[r.key] = r.valueText ?? "";
  }
  return out;
}

export async function getListingImages(listingId: number) {
  const db = await getDb();
  return db.select().from(listingImages).where(eq(listingImages.listingId, listingId)).orderBy(asc(listingImages.sort), asc(listingImages.id));
}

export async function getListingById(id: number) {
  const db = await getDb();
  const [l] = await db.select().from(listings).where(and(eq(listings.id, id), isNull(listings.deletedAt)));
  return l ?? null;
}

export async function getUserListings(userId: string, status?: ListingStatus | "all") {
  const db = await getDb();
  const conds = [eq(listings.userId, userId), isNull(listings.deletedAt)];
  if (status && status !== "all") conds.push(eq(listings.status, status));
  return db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      price: listings.price,
      priceMax: listings.priceMax,
      currency: listings.currency,
      pricePeriod: listings.pricePeriod,
      type: listings.type,
      rejectionReason: listings.rejectionReason,
      viewsCount: listings.viewsCount,
      favoritesCount: listings.favoritesCount,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      publishedAt: listings.publishedAt,
      featuredUntil: listings.featuredUntil,
      highlightUntil: listings.highlightUntil,
      thumbKey: sql<string | null>`(select thumb_key from listing_images li where li.listing_id = ${listings.id} order by li.sort, li.id limit 1)`,
    })
    .from(listings)
    .where(and(...conds))
    .orderBy(desc(listings.updatedAt));
}

export async function countUserListingsByStatus(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ status: listings.status, n: count() })
    .from(listings)
    .where(and(eq(listings.userId, userId), isNull(listings.deletedAt)))
    .groupBy(listings.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<ListingStatus, number>>;
}

export async function incrementViews(listingId: number) {
  const db = await getDb();
  await db.update(listings).set({ viewsCount: sql`${listings.viewsCount} + 1` }).where(eq(listings.id, listingId));
}

/** Archives listings older than the configured lifetime. */
export async function expireOldListings() {
  const db = await getDb();
  const { listingTtlDays } = await getSettings();
  const cutoff = new Date(Date.now() - listingTtlDays * 86_400_000);
  const expired = await db
    .update(listings)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(listings.status, "active"), sql`coalesce(${listings.rankedAt}, ${listings.publishedAt}) < ${cutoff}`))
    .returning({ id: listings.id, userId: listings.userId, title: listings.title });
  for (const l of expired) {
    await recordStatus(l.id, "active", "archived", null, "expired");
    await notify(l.userId, "listing_expired", { title: l.title }, "/account/listings?status=archived");
  }
  return expired.length;
}

export async function countRecentByUser(userId: string, sinceMs: number) {
  const db = await getDb();
  const [r] = await db
    .select({ n: count() })
    .from(listings)
    .where(and(eq(listings.userId, userId), gte(listings.createdAt, new Date(Date.now() - sinceMs))));
  return r?.n ?? 0;
}

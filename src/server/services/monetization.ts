import { and, asc, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  adCampaigns,
  adPlacements,
  listings,
  promotionPlans,
  promotions,
  stores,
  storeSubscriptions,
  subscriptionPlans,
  users,
} from "../db/schema";
import type { Role } from "../auth/permissions";
import { ServiceError } from "../errors";
import { audit } from "./audit";
import { getListingStats } from "./engagement";
import { getOwnedListing } from "./listings";
import { notify } from "./notifications";
import { getStoreByOwner } from "./stores";

/**
 * Paid features follow one rule: a request is created as "pending_payment" and becomes
 * "active" only through (a) a confirmed payment from an integrated provider, or
 * (b) an explicit staff confirmation recorded in the audit log (offline payment / promo).
 * Nothing in the UI simulates a successful online payment.
 */

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function getSubscriptionPlans(activeOnly = true) {
  const db = await getDb();
  return db
    .select()
    .from(subscriptionPlans)
    .where(activeOnly ? eq(subscriptionPlans.isActive, true) : undefined)
    .orderBy(asc(subscriptionPlans.sort), asc(subscriptionPlans.price));
}

export async function getPromotionPlans(activeOnly = true) {
  const db = await getDb();
  return db
    .select()
    .from(promotionPlans)
    .where(activeOnly ? eq(promotionPlans.isActive, true) : undefined)
    .orderBy(asc(promotionPlans.sort), asc(promotionPlans.price));
}

const i18n = z.object({ ru: z.string().trim().min(1).max(200), uz: z.string().trim().max(200).optional(), en: z.string().trim().max(200).optional() });

export const subscriptionPlanSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/),
  name: i18n,
  description: i18n.partial().optional().nullable(),
  price: z.number().min(0).max(1e12),
  currency: z.enum(["UZS", "USD"]),
  periodDays: z.number().int().min(1).max(366),
  listingLimit: z.number().int().min(0).max(100000),
  features: z.object({
    analytics: z.boolean().optional(),
    storePage: z.boolean().optional(),
    customLogo: z.boolean().optional(),
    freeBumpsPerMonth: z.number().int().min(0).max(1000).optional(),
  }),
  isActive: z.boolean(),
  sort: z.number().int().default(0),
});

export async function upsertSubscriptionPlan(actorId: string, id: number | null, input: z.input<typeof subscriptionPlanSchema>) {
  const data = subscriptionPlanSchema.parse(input);
  const db = await getDb();
  const [row] = id
    ? await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning()
    : await db.insert(subscriptionPlans).values(data).returning();
  if (!row) throw new ServiceError("not_found");
  await audit({ actorId, action: id ? "plan.update" : "plan.create", entityType: "subscription_plan", entityId: row.id, meta: { price: data.price, limit: data.listingLimit } });
  return row;
}

export const promotionPlanSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/),
  type: z.enum(["bump", "highlight", "featured"]),
  name: i18n,
  description: i18n.partial().optional().nullable(),
  price: z.number().min(0).max(1e12),
  currency: z.enum(["UZS", "USD"]),
  durationDays: z.number().int().min(1).max(365),
  categoryIds: z.array(z.number().int().positive()).default([]),
  isActive: z.boolean(),
  sort: z.number().int().default(0),
});

export async function upsertPromotionPlan(actorId: string, id: number | null, input: z.input<typeof promotionPlanSchema>) {
  const data = promotionPlanSchema.parse(input);
  const db = await getDb();
  const [row] = id
    ? await db.update(promotionPlans).set(data).where(eq(promotionPlans.id, id)).returning()
    : await db.insert(promotionPlans).values(data).returning();
  if (!row) throw new ServiceError("not_found");
  await audit({ actorId, action: id ? "promotion_plan.update" : "promotion_plan.create", entityType: "promotion_plan", entityId: row.id, meta: { price: data.price } });
  return row;
}

// ---------------------------------------------------------------------------
// Promotion requests
// ---------------------------------------------------------------------------

export async function requestPromotion(userId: string, listingId: number, planId: number) {
  const listing = await getOwnedListing(listingId, userId);
  if (listing.status !== "active") throw new ServiceError("invalid_status");
  const db = await getDb();
  const [plan] = await db.select().from(promotionPlans).where(and(eq(promotionPlans.id, planId), eq(promotionPlans.isActive, true)));
  if (!plan) throw new ServiceError("plan_unavailable");
  if (plan.categoryIds.length && !plan.categoryIds.includes(listing.categoryId)) throw new ServiceError("plan_unavailable");
  const [dup] = await db
    .select({ id: promotions.id })
    .from(promotions)
    .where(and(eq(promotions.listingId, listingId), eq(promotions.planId, planId), eq(promotions.status, "pending_payment")));
  if (dup) return dup.id;
  const [row] = await db.insert(promotions).values({ listingId, planId, userId, status: "pending_payment" }).returning({ id: promotions.id });
  return row!.id;
}

export async function cancelPromotionRequest(userId: string, promotionId: number) {
  const db = await getDb();
  const [row] = await db
    .update(promotions)
    .set({ status: "cancelled" })
    .where(and(eq(promotions.id, promotionId), eq(promotions.userId, userId), eq(promotions.status, "pending_payment")))
    .returning({ id: promotions.id });
  if (!row) throw new ServiceError("not_found");
}

/** Applies the effect of an active promotion to the listing. */
async function applyPromotion(promotionId: number) {
  const db = await getDb();
  const [p] = await db
    .select({ promo: promotions, plan: promotionPlans, listing: listings })
    .from(promotions)
    .innerJoin(promotionPlans, eq(promotionPlans.id, promotions.planId))
    .innerJoin(listings, eq(listings.id, promotions.listingId))
    .where(eq(promotions.id, promotionId));
  if (!p) throw new ServiceError("not_found");
  const now = new Date();
  const ends = new Date(now.getTime() + p.plan.durationDays * 86_400_000);
  await db
    .update(promotions)
    .set({ status: "active", startsAt: now, endsAt: ends, viewsAtStart: p.listing.viewsCount })
    .where(eq(promotions.id, promotionId));
  const set: Partial<typeof listings.$inferInsert> = { updatedAt: now };
  if (p.plan.type === "bump") set.rankedAt = now;
  if (p.plan.type === "highlight") set.highlightUntil = ends;
  if (p.plan.type === "featured") set.featuredUntil = ends;
  await db.update(listings).set(set).where(eq(listings.id, p.listing.id));
  await notify(p.promo.userId, "promotion_activated", { title: p.listing.title }, `/account/promotions`);
}

/** Staff confirmation (e.g. offline payment received). Audited. */
export async function adminActivatePromotion(actor: { id: string; role: Role }, promotionId: number, note: string) {
  const db = await getDb();
  const [p] = await db.select().from(promotions).where(eq(promotions.id, promotionId));
  if (!p || p.status !== "pending_payment") throw new ServiceError("invalid_status");
  if (!note.trim()) throw new ServiceError("invalid_input", "note");
  await db.update(promotions).set({ activationSource: "admin", activatedBy: actor.id }).where(eq(promotions.id, promotionId));
  await applyPromotion(promotionId);
  await audit({ actorId: actor.id, action: "promotion.activate_manual", entityType: "promotion", entityId: promotionId, meta: { note: note.slice(0, 500) } });
}

export async function adminCancelPromotion(actor: { id: string; role: Role }, promotionId: number) {
  const db = await getDb();
  const [p] = await db.update(promotions).set({ status: "cancelled" }).where(eq(promotions.id, promotionId)).returning();
  if (!p) throw new ServiceError("not_found");
  await audit({ actorId: actor.id, action: "promotion.cancel", entityType: "promotion", entityId: promotionId });
}

export async function getUserPromotions(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ promo: promotions, plan: promotionPlans, title: listings.title, slug: listings.slug, views: listings.viewsCount })
    .from(promotions)
    .innerJoin(promotionPlans, eq(promotionPlans.id, promotions.planId))
    .innerJoin(listings, eq(listings.id, promotions.listingId))
    .where(eq(promotions.userId, userId))
    .orderBy(desc(promotions.createdAt));
  // Result report: real counters measured during the promotion period.
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      result: r.promo.startsAt ? await getListingStats(r.promo.listingId, r.promo.startsAt.toISOString().slice(0, 10)) : null,
    })),
  );
}

export async function adminListPromotions(status?: string) {
  const db = await getDb();
  return db
    .select({ promo: promotions, plan: promotionPlans, title: listings.title, slug: listings.slug, userName: users.displayName })
    .from(promotions)
    .innerJoin(promotionPlans, eq(promotionPlans.id, promotions.planId))
    .innerJoin(listings, eq(listings.id, promotions.listingId))
    .innerJoin(users, eq(users.id, promotions.userId))
    .where(status ? eq(promotions.status, status as "pending_payment") : undefined)
    .orderBy(desc(promotions.createdAt))
    .limit(200);
}

// ---------------------------------------------------------------------------
// Store subscriptions
// ---------------------------------------------------------------------------

export async function requestSubscription(userId: string, planId: number) {
  const store = await getStoreByOwner(userId);
  if (!store || store.status !== "active") throw new ServiceError("not_found");
  const db = await getDb();
  const [plan] = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true)));
  if (!plan || plan.price <= 0) throw new ServiceError("plan_unavailable");
  const [dup] = await db
    .select({ id: storeSubscriptions.id })
    .from(storeSubscriptions)
    .where(and(eq(storeSubscriptions.storeId, store.id), eq(storeSubscriptions.status, "pending_payment")));
  if (dup) {
    await db.update(storeSubscriptions).set({ planId }).where(eq(storeSubscriptions.id, dup.id));
    return dup.id;
  }
  const [row] = await db.insert(storeSubscriptions).values({ storeId: store.id, planId, status: "pending_payment" }).returning({ id: storeSubscriptions.id });
  return row!.id;
}

export async function adminActivateSubscription(actor: { id: string; role: Role }, subscriptionId: number, note: string) {
  const db = await getDb();
  const [s] = await db
    .select({ sub: storeSubscriptions, plan: subscriptionPlans, store: stores })
    .from(storeSubscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, storeSubscriptions.planId))
    .innerJoin(stores, eq(stores.id, storeSubscriptions.storeId))
    .where(eq(storeSubscriptions.id, subscriptionId));
  if (!s || s.sub.status !== "pending_payment") throw new ServiceError("invalid_status");
  if (!note.trim()) throw new ServiceError("invalid_input", "note");
  // Extend from the end of a currently active subscription, if any.
  const [current] = await db
    .select({ endsAt: storeSubscriptions.endsAt })
    .from(storeSubscriptions)
    .where(and(eq(storeSubscriptions.storeId, s.store.id), eq(storeSubscriptions.status, "active"), sql`${storeSubscriptions.endsAt} > now()`))
    .orderBy(desc(storeSubscriptions.endsAt))
    .limit(1);
  const start = current?.endsAt && current.endsAt > new Date() ? current.endsAt : new Date();
  const end = new Date(start.getTime() + s.plan.periodDays * 86_400_000);
  await db
    .update(storeSubscriptions)
    .set({ status: "active", startsAt: start, endsAt: end, activationSource: "admin", activatedBy: actor.id })
    .where(eq(storeSubscriptions.id, subscriptionId));
  await audit({ actorId: actor.id, action: "subscription.activate_manual", entityType: "store_subscription", entityId: subscriptionId, meta: { note: note.slice(0, 500), plan: s.plan.code } });
  await notify(s.store.ownerId, "subscription_activated", { plan: s.plan.name.ru ?? s.plan.code }, "/account/subscription");
}

export async function adminCancelSubscription(actor: { id: string; role: Role }, subscriptionId: number) {
  const db = await getDb();
  const [s] = await db.update(storeSubscriptions).set({ status: "cancelled" }).where(eq(storeSubscriptions.id, subscriptionId)).returning();
  if (!s) throw new ServiceError("not_found");
  await audit({ actorId: actor.id, action: "subscription.cancel", entityType: "store_subscription", entityId: subscriptionId });
}

export async function adminListSubscriptions(status?: string) {
  const db = await getDb();
  return db
    .select({ sub: storeSubscriptions, plan: subscriptionPlans, storeName: stores.name, storeSlug: stores.slug })
    .from(storeSubscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, storeSubscriptions.planId))
    .innerJoin(stores, eq(stores.id, storeSubscriptions.storeId))
    .where(status ? eq(storeSubscriptions.status, status as "pending_payment") : undefined)
    .orderBy(desc(storeSubscriptions.createdAt))
    .limit(200);
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

export async function expirePaidFeatures() {
  const db = await getDb();
  const now = new Date();
  await db.update(promotions).set({ status: "expired" }).where(and(eq(promotions.status, "active"), lte(promotions.endsAt, now)));
  await db.update(storeSubscriptions).set({ status: "expired" }).where(and(eq(storeSubscriptions.status, "active"), lte(storeSubscriptions.endsAt, now)));
  await db.update(adCampaigns).set({ status: "ended" }).where(and(inArray(adCampaigns.status, ["active", "paused"]), lte(adCampaigns.endsAt, now)));
}

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------

export async function getAdPlacements() {
  const db = await getDb();
  return db.select().from(adPlacements).orderBy(asc(adPlacements.id));
}

export const placementSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_]{2,40}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  width: z.number().int().min(50).max(4000),
  height: z.number().int().min(50).max(4000),
  isActive: z.boolean(),
});

export async function upsertPlacement(actorId: string, id: number | null, input: z.input<typeof placementSchema>) {
  const data = placementSchema.parse(input);
  const db = await getDb();
  const [row] = id
    ? await db.update(adPlacements).set(data).where(eq(adPlacements.id, id)).returning()
    : await db.insert(adPlacements).values(data).returning();
  await audit({ actorId, action: id ? "ad_placement.update" : "ad_placement.create", entityType: "ad_placement", entityId: row?.id });
  return row!;
}

export const campaignSchema = z.object({
  placementId: z.number().int().positive(),
  advertiser: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(120),
  targetUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https:\/\//i.test(u), "https only"),
  categoryId: z.number().int().positive().nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: z.enum(["draft", "active", "paused", "ended"]),
});

export async function upsertCampaign(actorId: string, id: number | null, input: z.input<typeof campaignSchema>, imageKey?: string) {
  const data = campaignSchema.parse(input);
  if (data.endsAt <= data.startsAt) throw new ServiceError("invalid_input", "endsAt");
  const db = await getDb();
  const values = { ...data, ...(imageKey ? { imageKey } : {}) };
  const [row] = id
    ? await db.update(adCampaigns).set(values).where(eq(adCampaigns.id, id)).returning()
    : await db.insert(adCampaigns).values({ ...values, createdBy: actorId }).returning();
  if (!row) throw new ServiceError("not_found");
  await audit({ actorId, action: id ? "ad_campaign.update" : "ad_campaign.create", entityType: "ad_campaign", entityId: row.id });
  return row;
}

export async function listCampaigns() {
  const db = await getDb();
  return db
    .select({ c: adCampaigns, placement: adPlacements.name })
    .from(adCampaigns)
    .innerJoin(adPlacements, eq(adPlacements.id, adCampaigns.placementId))
    .orderBy(desc(adCampaigns.createdAt));
}

/** Picks a running campaign for a placement (optionally targeted by category). */
export async function pickAd(placementCode: string, categoryId?: number | null) {
  const db = await getDb();
  const rows = await db
    .select({ c: adCampaigns })
    .from(adCampaigns)
    .innerJoin(adPlacements, eq(adPlacements.id, adCampaigns.placementId))
    .where(
      and(
        eq(adPlacements.code, placementCode),
        eq(adPlacements.isActive, true),
        eq(adCampaigns.status, "active"),
        sql`${adCampaigns.startsAt} <= now() AND ${adCampaigns.endsAt} > now()`,
        sql`${adCampaigns.imageKey} IS NOT NULL`,
        categoryId ? sql`(${adCampaigns.categoryId} IS NULL OR ${adCampaigns.categoryId} = ${categoryId})` : isNull(adCampaigns.categoryId),
      ),
    )
    .orderBy(sql`random()`)
    .limit(1);
  const ad = rows[0]?.c;
  if (ad) await db.update(adCampaigns).set({ impressions: sql`${adCampaigns.impressions} + 1` }).where(eq(adCampaigns.id, ad.id));
  return ad ?? null;
}

export async function registerAdClick(campaignId: number) {
  const db = await getDb();
  const [c] = await db
    .update(adCampaigns)
    .set({ clicks: sql`${adCampaigns.clicks} + 1` })
    .where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.status, "active")))
    .returning({ url: adCampaigns.targetUrl });
  return c?.url ?? null;
}

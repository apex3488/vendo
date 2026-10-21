import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizePhone, normalizeTelegram } from "@/lib/contacts";
import { slugify } from "@/lib/slug";
import { getDb } from "../db";
import { listings, stores, storeSubscriptions, subscriptionPlans, users } from "../db/schema";
import type { Role } from "../auth/permissions";
import { ServiceError } from "../errors";
import { audit } from "./audit";
import { notify } from "./notifications";

export const storeInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(60).optional().default(""),
  description: z.string().trim().max(3000).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  telegram: z.string().trim().max(60).optional().default(""),
  cityId: z.coerce.number().int().positive().nullable().optional(),
});

const RESERVED = new Set(["admin", "account", "api", "new", "edit", "settings", "vendo", "support", "help"]);

export async function getStoreByOwner(ownerId: string) {
  const db = await getDb();
  const [s] = await db.select().from(stores).where(eq(stores.ownerId, ownerId));
  return s ?? null;
}

export async function getStoreBySlug(slug: string) {
  const db = await getDb();
  const [s] = await db
    .select({
      store: stores,
      ownerStatus: users.status,
      activeCount: sql<number>`(select count(*)::int from listings l where l.store_id = ${stores.id} and l.status = 'active' and l.deleted_at is null)`,
    })
    .from(stores)
    .innerJoin(users, eq(users.id, stores.ownerId))
    .where(eq(stores.slug, slug));
  if (!s || s.store.status !== "active" || s.ownerStatus !== "active") return null;
  return { ...s.store, activeCount: Number(s.activeCount) };
}

/** Creates or updates the user's store. One store per user. */
export async function saveStore(ownerId: string, input: z.input<typeof storeInputSchema>, logoKey?: string | null) {
  const data = storeInputSchema.parse(input);
  const phone = data.phone ? normalizePhone(data.phone) : null;
  if (data.phone && !phone) throw new ServiceError("invalid_phone", "phone");
  const telegram = data.telegram ? normalizeTelegram(data.telegram) : null;
  if (data.telegram && !telegram) throw new ServiceError("invalid_telegram", "telegram");
  const slug = slugify(data.slug || data.name, 60);
  if (slug.length < 3 || RESERVED.has(slug)) throw new ServiceError("slug_taken", "slug");
  const db = await getDb();
  const existing = await getStoreByOwner(ownerId);
  const [taken] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug));
  if (taken && taken.id !== existing?.id) throw new ServiceError("slug_taken", "slug");
  const values = {
    name: data.name,
    slug,
    description: data.description || null,
    phone,
    telegram,
    cityId: data.cityId ?? null,
    updatedAt: new Date(),
    ...(logoKey !== undefined ? { logoKey } : {}),
  };
  if (existing) {
    if (existing.status === "suspended") throw new ServiceError("forbidden");
    await db.update(stores).set(values).where(eq(stores.id, existing.id));
    return existing.id;
  }
  const [row] = await db.insert(stores).values({ ...values, ownerId }).returning({ id: stores.id });
  await db.update(listings).set({ storeId: row!.id }).where(eq(listings.userId, ownerId));
  await db.update(users).set({ role: "seller" }).where(and(eq(users.id, ownerId), eq(users.role, "user")));
  return row!.id;
}

export async function getActiveSubscription(storeId: number) {
  const db = await getDb();
  const [s] = await db
    .select({ sub: storeSubscriptions, plan: subscriptionPlans })
    .from(storeSubscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, storeSubscriptions.planId))
    .where(and(eq(storeSubscriptions.storeId, storeId), eq(storeSubscriptions.status, "active"), sql`${storeSubscriptions.endsAt} > now()`))
    .orderBy(desc(storeSubscriptions.endsAt))
    .limit(1);
  return s ?? null;
}

export async function getSubscriptionHistory(storeId: number) {
  const db = await getDb();
  return db
    .select({ sub: storeSubscriptions, plan: subscriptionPlans })
    .from(storeSubscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, storeSubscriptions.planId))
    .where(eq(storeSubscriptions.storeId, storeId))
    .orderBy(desc(storeSubscriptions.createdAt));
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export async function adminListStores(opts: { q?: string; status?: string; page: number }) {
  const db = await getDb();
  const perPage = 25;
  const conds = [];
  if (opts.q) conds.push(or(ilike(stores.name, `%${opts.q}%`), ilike(stores.slug, `%${opts.q}%`))!);
  if (opts.status === "active" || opts.status === "suspended") conds.push(eq(stores.status, opts.status));
  const where = conds.length ? and(...conds) : undefined;
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        status: stores.status,
        verifiedAt: stores.verifiedAt,
        createdAt: stores.createdAt,
        ownerName: users.displayName,
        ownerId: users.id,
        activeCount: sql<number>`(select count(*)::int from listings l where l.store_id = ${stores.id} and l.status = 'active' and l.deleted_at is null)`,
        planName: sql<Record<string, string> | null>`(select p.name from store_subscriptions s join subscription_plans p on p.id = s.plan_id where s.store_id = ${stores.id} and s.status = 'active' and s.ends_at > now() order by s.ends_at desc limit 1)`,
      })
      .from(stores)
      .innerJoin(users, eq(users.id, stores.ownerId))
      .where(where)
      .orderBy(desc(stores.createdAt))
      .limit(perPage)
      .offset((opts.page - 1) * perPage),
    db.select({ n: count() }).from(stores).where(where),
  ]);
  return { items, total: total?.n ?? 0, perPage };
}

export async function adminSetStoreStatus(actor: { id: string; role: Role }, storeId: number, status: "active" | "suspended") {
  const db = await getDb();
  const [s] = await db.update(stores).set({ status, updatedAt: new Date() }).where(eq(stores.id, storeId)).returning();
  if (!s) throw new ServiceError("not_found");
  await audit({ actorId: actor.id, action: `store.${status === "active" ? "activate" : "suspend"}`, entityType: "store", entityId: storeId });
}

/** Marks a store verified. Must only be used after staff actually checked documents. */
export async function adminSetStoreVerified(actor: { id: string; role: Role }, storeId: number, verified: boolean) {
  const db = await getDb();
  const [s] = await db
    .update(stores)
    .set({ verifiedAt: verified ? new Date() : null, verifiedBy: verified ? actor.id : null, updatedAt: new Date() })
    .where(eq(stores.id, storeId))
    .returning();
  if (!s) throw new ServiceError("not_found");
  await audit({ actorId: actor.id, action: verified ? "store.verify" : "store.unverify", entityType: "store", entityId: storeId });
  if (verified) await notify(s.ownerId, "store_verified", { name: s.name }, `/store/${s.slug}`);
}

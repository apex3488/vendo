import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Translatable string: { ru: "...", uz: "...", en: "..." }. New locales need no migration. */
export type I18nText = Partial<Record<"ru" | "uz" | "en", string>>;

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", [
  "super_admin",
  "admin",
  "moderator",
  "support",
  "seller",
  "user",
]);
export const userStatus = pgEnum("user_status", ["active", "blocked"]);
export const listingType = pgEnum("listing_type", ["sale", "rent", "service"]);
export const listingStatus = pgEnum("listing_status", [
  "draft",
  "pending",
  "active",
  "rejected",
  "archived",
  "sold",
  "blocked",
]);
export const itemCondition = pgEnum("item_condition", ["new", "like_new", "used", "for_parts"]);
export const pricePeriod = pgEnum("price_period", ["hour", "day", "week", "month"]);
export const attributeType = pgEnum("attribute_type", [
  "text",
  "number",
  "select",
  "multiselect",
  "boolean",
  "date",
]);
export const storeStatus = pgEnum("store_status", ["active", "suspended"]);
export const paidStatus = pgEnum("paid_status", [
  "pending_payment",
  "active",
  "expired",
  "cancelled",
]);
export const promotionType = pgEnum("promotion_type", ["bump", "highlight", "featured"]);
export const reportTarget = pgEnum("report_target", ["listing", "user"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);
export const campaignStatus = pgEnum("campaign_status", ["draft", "active", "paused", "ended"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"]);
export const auditResult = pgEnum("audit_result", ["success", "denied", "error"]);

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("UZ"),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: jsonb("name").$type<I18nText>().notNull(),
  sort: integer("sort").notNull().default(0),
});

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: jsonb("name").$type<I18nText>().notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("cities_region_idx").on(t.regionId)],
);

// ---------------------------------------------------------------------------
// Users, sessions
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }),
    username: varchar("username", { length: 40 }),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    role: userRole("role").notNull().default("user"),
    status: userStatus("status").notNull().default("active"),
    blockedReason: text("blocked_reason"),
    locale: varchar("locale", { length: 5 }).notNull().default("ru"),
    cityId: integer("city_id").references(() => cities.id, { onDelete: "set null" }),
    phone: varchar("phone", { length: 20 }),
    telegram: varchar("telegram", { length: 40 }),
    showPhone: boolean("show_phone").notNull().default(false),
    avatarKey: text("avatar_key"),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(sql`lower(${t.email})`),
    uniqueIndex("users_username_uq").on(sql`lower(${t.username})`),
    index("users_role_idx").on(t.role),
    index("users_created_idx").on(t.createdAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the random token stored in the cookie. The raw token is never stored. */
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Categories and attributes
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id"),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: jsonb("name").$type<I18nText>().notNull(),
    description: jsonb("description").$type<I18nText>(),
    icon: varchar("icon", { length: 40 }),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    /** Which listing types are allowed in this category. */
    allowedTypes: listingType("allowed_types").array().notNull().default(sql`'{sale}'::listing_type[]`),
    /** Whether the "condition" field applies (not for services, flowers, etc.). */
    hasCondition: boolean("has_condition").notNull().default(true),
    /** High-value categories show an extra safety warning (cars, real estate). */
    highValue: boolean("high_value").notNull().default(false),
    seoTitle: jsonb("seo_title").$type<I18nText>(),
    seoDescription: jsonb("seo_description").$type<I18nText>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("categories_parent_idx").on(t.parentId, t.sort),
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: "categories_parent_fk" }).onDelete(
      "restrict",
    ),
  ],
);

export const categoryAttributes = pgTable(
  "category_attributes",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 60 }).notNull(),
    label: jsonb("label").$type<I18nText>().notNull(),
    type: attributeType("type").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    isFilterable: boolean("is_filterable").notNull().default(false),
    unit: varchar("unit", { length: 20 }),
    minValue: numeric("min_value", { mode: "number" }),
    maxValue: numeric("max_value", { mode: "number" }),
    maxLength: integer("max_length"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("category_attributes_key_uq").on(t.categoryId, t.key)],
);

export const categoryAttributeOptions = pgTable(
  "category_attribute_options",
  {
    id: serial("id").primaryKey(),
    attributeId: integer("attribute_id")
      .notNull()
      .references(() => categoryAttributes.id, { onDelete: "cascade" }),
    value: varchar("value", { length: 80 }).notNull(),
    label: jsonb("label").$type<I18nText>().notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("category_attribute_options_uq").on(t.attributeId, t.value)],
);

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export const stores = pgTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 60 }).notNull().unique(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    logoKey: text("logo_key"),
    phone: varchar("phone", { length: 20 }),
    telegram: varchar("telegram", { length: 40 }),
    cityId: integer("city_id").references(() => cities.id, { onDelete: "set null" }),
    status: storeStatus("status").notNull().default("active"),
    /** Set only by staff after a real verification. Never set automatically. */
    verifiedAt: ts("verified_at"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("stores_status_idx").on(t.status)],
);

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const listings = pgTable(
  "listings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: integer("store_id").references(() => stores.id, { onDelete: "set null" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    type: listingType("type").notNull().default("sale"),
    title: varchar("title", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description").notNull().default(""),
    price: numeric("price", { precision: 14, scale: 2, mode: "number" }),
    priceMax: numeric("price_max", { precision: 14, scale: 2, mode: "number" }),
    currency: varchar("currency", { length: 3 }).notNull().default("UZS"),
    pricePeriod: pricePeriod("price_period"),
    deposit: numeric("deposit", { precision: 14, scale: 2, mode: "number" }),
    isNegotiable: boolean("is_negotiable").notNull().default(false),
    condition: itemCondition("condition"),
    cityId: integer("city_id").references(() => cities.id, { onDelete: "set null" }),
    phone: varchar("phone", { length: 20 }),
    telegram: varchar("telegram", { length: 40 }),
    hidePhone: boolean("hide_phone").notNull().default(true),
    status: listingStatus("status").notNull().default("draft"),
    rejectionReason: text("rejection_reason"),
    publishedAt: ts("published_at"),
    /** Sort key for "freshness": publication time, moved forward by a bump promotion. */
    rankedAt: ts("ranked_at"),
    highlightUntil: ts("highlight_until"),
    featuredUntil: ts("featured_until"),
    viewsCount: integer("views_count").notNull().default(0),
    favoritesCount: integer("favorites_count").notNull().default(0),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(description, '')), 'B')`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    index("listings_status_ranked_idx").on(t.status, t.rankedAt.desc()),
    index("listings_category_idx").on(t.categoryId, t.status),
    index("listings_city_idx").on(t.cityId, t.status),
    index("listings_user_idx").on(t.userId, t.status),
    index("listings_store_idx").on(t.storeId),
    index("listings_price_idx").on(t.price),
    index("listings_search_idx").using("gin", t.searchVector),
    index("listings_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ],
);

export const listingAttributeValues = pgTable(
  "listing_attribute_values",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    listingId: bigint("listing_id", { mode: "number" })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    attributeId: integer("attribute_id")
      .notNull()
      .references(() => categoryAttributes.id, { onDelete: "cascade" }),
    optionId: integer("option_id").references(() => categoryAttributeOptions.id, {
      onDelete: "cascade",
    }),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { mode: "number" }),
    valueBool: boolean("value_bool"),
    valueDate: date("value_date"),
  },
  (t) => [
    index("lav_listing_idx").on(t.listingId),
    index("lav_option_idx").on(t.attributeId, t.optionId),
    index("lav_number_idx").on(t.attributeId, t.valueNumber),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: serial("id").primaryKey(),
    listingId: bigint("listing_id", { mode: "number" })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("listing_images_listing_idx").on(t.listingId, t.sort)],
);

export const listingStatusHistory = pgTable(
  "listing_status_history",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    listingId: bigint("listing_id", { mode: "number" })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    fromStatus: listingStatus("from_status"),
    toStatus: listingStatus("to_status").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("lsh_listing_idx").on(t.listingId, t.createdAt)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: bigint("listing_id", { mode: "number" })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] }), index("favorites_listing_idx").on(t.listingId)],
);

/** Aggregated per-day counters. No personal data, no individual event rows. */
export const listingDailyStats = pgTable(
  "listing_daily_stats",
  {
    listingId: bigint("listing_id", { mode: "number" })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
    phoneReveals: integer("phone_reveals").notNull().default(0),
    callClicks: integer("call_clicks").notNull().default(0),
    telegramClicks: integer("telegram_clicks").notNull().default(0),
    favorites: integer("favorites").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.listingId, t.day] })],
);

export const searchQueries = pgTable("search_queries", {
  query: varchar("query", { length: 80 }).primaryKey(),
  count: integer("count").notNull().default(1),
  lastSearchedAt: ts("last_searched_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Monetization
// ---------------------------------------------------------------------------

export type PlanFeatures = {
  analytics?: boolean;
  storePage?: boolean;
  customLogo?: boolean;
  freeBumpsPerMonth?: number;
};

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: jsonb("name").$type<I18nText>().notNull(),
  description: jsonb("description").$type<I18nText>(),
  price: numeric("price", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("UZS"),
  periodDays: integer("period_days").notNull().default(30),
  listingLimit: integer("listing_limit").notNull(),
  features: jsonb("features").$type<PlanFeatures>().notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const storeSubscriptions = pgTable(
  "store_subscriptions",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: paidStatus("status").notNull().default("pending_payment"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    /** How the subscription got activated: "admin" (manual confirmation) or "payment". */
    activationSource: varchar("activation_source", { length: 20 }),
    activatedBy: uuid("activated_by").references(() => users.id, { onDelete: "set null" }),
    paymentId: integer("payment_id"),
    createdAt: createdAt(),
  },
  (t) => [index("store_subscriptions_store_idx").on(t.storeId, t.status)],
);

export const promotionPlans = pgTable("promotion_plans", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: promotionType("type").notNull(),
  name: jsonb("name").$type<I18nText>().notNull(),
  description: jsonb("description").$type<I18nText>(),
  price: numeric("price", { precision: 14, scale: 2, mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("UZS"),
  durationDays: integer("duration_days").notNull(),
  /** Empty = available in all categories. */
  categoryIds: integer("category_ids").array().notNull().default(sql`'{}'::integer[]`),
  isActive: boolean("is_active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const promotions = pgTable(
  "promotions",
  {
    id: serial("id").primaryKey(),
    listingId: bigint("listing_id", { mode: "number" })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => promotionPlans.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: paidStatus("status").notNull().default("pending_payment"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    activationSource: varchar("activation_source", { length: 20 }),
    activatedBy: uuid("activated_by").references(() => users.id, { onDelete: "set null" }),
    paymentId: integer("payment_id"),
    viewsAtStart: integer("views_at_start"),
    createdAt: createdAt(),
  },
  (t) => [index("promotions_listing_idx").on(t.listingId), index("promotions_status_idx").on(t.status)],
);

/** Prepared for a future payment provider. Nothing writes "succeeded" without a provider callback. */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  referenceId: integer("reference_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  provider: varchar("provider", { length: 30 }).notNull(),
  providerRef: varchar("provider_ref", { length: 120 }),
  status: paymentStatus("status").notNull().default("pending"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const adPlacements = pgTable("ad_placements", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: serial("id").primaryKey(),
    placementId: integer("placement_id")
      .notNull()
      .references(() => adPlacements.id, { onDelete: "restrict" }),
    advertiser: varchar("advertiser", { length: 120 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    imageKey: text("image_key"),
    targetUrl: text("target_url").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    status: campaignStatus("status").notNull().default("draft"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("ad_campaigns_active_idx").on(t.placementId, t.status, t.startsAt, t.endsAt)],
);

// ---------------------------------------------------------------------------
// Trust & safety
// ---------------------------------------------------------------------------

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: reportTarget("target_type").notNull(),
    listingId: bigint("listing_id", { mode: "number" }).references(() => listings.id, {
      onDelete: "cascade",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 40 }).notNull(),
    details: text("details"),
    status: reportStatus("status").notNull().default("open"),
    resolution: text("resolution"),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
    handledAt: ts("handled_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.createdAt),
    index("reports_listing_idx").on(t.listingId),
    index("reports_user_idx").on(t.targetUserId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    /** i18n message key + params, rendered in the reader's language. */
    params: jsonb("params").$type<Record<string, string | number>>().notNull().default({}),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 60 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    result: auditResult("result").notNull().default("success"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_actor_idx").on(t.actorId),
    index("audit_entity_idx").on(t.entityType, t.entityId),
  ],
);

// ---------------------------------------------------------------------------
// Content & settings
// ---------------------------------------------------------------------------

export const contentPages = pgTable("content_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  kind: varchar("kind", { length: 20 }).notNull().default("page"),
  title: jsonb("title").$type<I18nText>().notNull(),
  /** Plain text with simple markup (paragraphs, "## " headings, "- " lists). Rendered escaped. */
  body: jsonb("body").$type<I18nText>().notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  updatedAt: updatedAt(),
});

export type CollectionFilter = {
  categorySlug?: string;
  type?: "sale" | "rent" | "service";
  sort?: "new" | "price_asc" | "price_desc" | "popular";
  maxPrice?: number;
  q?: string;
};

export const homeCollections = pgTable("home_collections", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  title: jsonb("title").$type<I18nText>().notNull(),
  filter: jsonb("filter").$type<CollectionFilter>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 160 }).primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull().default(0),
});

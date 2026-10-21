CREATE TYPE "public"."attribute_type" AS ENUM('text', 'number', 'select', 'multiselect', 'boolean', 'date');--> statement-breakpoint
CREATE TYPE "public"."audit_result" AS ENUM('success', 'denied', 'error');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."item_condition" AS ENUM('new', 'like_new', 'used', 'for_parts');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending', 'active', 'rejected', 'archived', 'sold', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('sale', 'rent', 'service');--> statement-breakpoint
CREATE TYPE "public"."paid_status" AS ENUM('pending_payment', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."price_period" AS ENUM('hour', 'day', 'week', 'month');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('bump', 'highlight', 'featured');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('listing', 'user');--> statement-breakpoint
CREATE TYPE "public"."store_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'moderator', 'support', 'seller', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"placement_id" integer NOT NULL,
	"advertiser" varchar(120) NOT NULL,
	"title" varchar(120) NOT NULL,
	"image_key" text,
	"target_url" text NOT NULL,
	"category_id" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_placements" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ad_placements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" varchar(60) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" varchar(64),
	"result" "audit_result" DEFAULT 'success' NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"slug" varchar(100) NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"icon" varchar(40),
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"allowed_types" "listing_type"[] DEFAULT '{sale}'::listing_type[] NOT NULL,
	"has_condition" boolean DEFAULT true NOT NULL,
	"high_value" boolean DEFAULT false NOT NULL,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_attribute_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"attribute_id" integer NOT NULL,
	"value" varchar(80) NOT NULL,
	"label" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_attributes" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"key" varchar(60) NOT NULL,
	"label" jsonb NOT NULL,
	"type" "attribute_type" NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"unit" varchar(20),
	"min_value" numeric,
	"max_value" numeric,
	"max_length" integer,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"kind" varchar(20) DEFAULT 'page' NOT NULL,
	"title" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"listing_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "home_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" jsonb NOT NULL,
	"filter" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "home_collections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "listing_attribute_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"attribute_id" integer NOT NULL,
	"option_id" integer,
	"value_text" text,
	"value_number" numeric,
	"value_bool" boolean,
	"value_date" date
);
--> statement-breakpoint
CREATE TABLE "listing_daily_stats" (
	"listing_id" bigint NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"phone_reveals" integer DEFAULT 0 NOT NULL,
	"call_clicks" integer DEFAULT 0 NOT NULL,
	"telegram_clicks" integer DEFAULT 0 NOT NULL,
	"favorites" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "listing_daily_stats_listing_id_day_pk" PRIMARY KEY("listing_id","day")
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_status_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"from_status" "listing_status",
	"to_status" "listing_status" NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"store_id" integer,
	"category_id" integer NOT NULL,
	"type" "listing_type" DEFAULT 'sale' NOT NULL,
	"title" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(14, 2),
	"price_max" numeric(14, 2),
	"currency" varchar(3) DEFAULT 'UZS' NOT NULL,
	"price_period" "price_period",
	"deposit" numeric(14, 2),
	"is_negotiable" boolean DEFAULT false NOT NULL,
	"condition" "item_condition",
	"city_id" integer,
	"phone" varchar(20),
	"telegram" varchar(40),
	"hide_phone" boolean DEFAULT true NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"published_at" timestamp with time zone,
	"ranked_at" timestamp with time zone,
	"highlight_until" timestamp with time zone,
	"featured_until" timestamp with time zone,
	"views_count" integer DEFAULT 0 NOT NULL,
	"favorites_count" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(description, '')), 'B')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"purpose" varchar(20) NOT NULL,
	"reference_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"provider" varchar(30) NOT NULL,
	"provider_ref" varchar(120),
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"type" "promotion_type" NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"price" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'UZS' NOT NULL,
	"duration_days" integer NOT NULL,
	"category_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "promotion_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"plan_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "paid_status" DEFAULT 'pending_payment' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"activation_source" varchar(20),
	"activated_by" uuid,
	"payment_id" integer,
	"views_at_start" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(160) PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(2) DEFAULT 'UZ' NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" uuid,
	"target_type" "report_target" NOT NULL,
	"listing_id" bigint,
	"target_user_id" uuid,
	"reason" varchar(40) NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"query" varchar(80) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" "paid_status" DEFAULT 'pending_payment' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"activation_source" varchar(20),
	"activated_by" uuid,
	"payment_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"logo_key" text,
	"phone" varchar(20),
	"telegram" varchar(40),
	"city_id" integer,
	"status" "store_status" DEFAULT 'active' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_owner_id_unique" UNIQUE("owner_id"),
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"price" numeric(14, 2) DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'UZS' NOT NULL,
	"period_days" integer DEFAULT 30 NOT NULL,
	"listing_limit" integer NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254),
	"username" varchar(40),
	"password_hash" text NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"blocked_reason" text,
	"locale" varchar(5) DEFAULT 'ru' NOT NULL,
	"city_id" integer,
	"phone" varchar(20),
	"telegram" varchar(40),
	"show_phone" boolean DEFAULT false NOT NULL,
	"avatar_key" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_placement_id_ad_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."ad_placements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attribute_options" ADD CONSTRAINT "category_attribute_options_attribute_id_category_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."category_attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_attribute_values" ADD CONSTRAINT "listing_attribute_values_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_attribute_values" ADD CONSTRAINT "listing_attribute_values_attribute_id_category_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."category_attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_attribute_values" ADD CONSTRAINT "listing_attribute_values_option_id_category_attribute_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."category_attribute_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_daily_stats" ADD CONSTRAINT "listing_daily_stats_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_plan_id_promotion_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."promotion_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_campaigns_active_idx" ON "ad_campaigns" USING btree ("placement_id","status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "admin_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "category_attribute_options_uq" ON "category_attribute_options" USING btree ("attribute_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "category_attributes_key_uq" ON "category_attributes" USING btree ("category_id","key");--> statement-breakpoint
CREATE INDEX "cities_region_idx" ON "cities" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "favorites_listing_idx" ON "favorites" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "lav_listing_idx" ON "listing_attribute_values" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "lav_option_idx" ON "listing_attribute_values" USING btree ("attribute_id","option_id");--> statement-breakpoint
CREATE INDEX "lav_number_idx" ON "listing_attribute_values" USING btree ("attribute_id","value_number");--> statement-breakpoint
CREATE INDEX "listing_images_listing_idx" ON "listing_images" USING btree ("listing_id","sort");--> statement-breakpoint
CREATE INDEX "lsh_listing_idx" ON "listing_status_history" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "listings_status_ranked_idx" ON "listings" USING btree ("status","ranked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city_id","status");--> statement-breakpoint
CREATE INDEX "listings_user_idx" ON "listings" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "listings_store_idx" ON "listings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX "listings_search_idx" ON "listings" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "listings_title_trgm_idx" ON "listings" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "promotions_listing_idx" ON "promotions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "promotions_status_idx" ON "promotions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_listing_idx" ON "reports" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "reports_user_idx" ON "reports" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "store_subscriptions_store_idx" ON "store_subscriptions" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "stores_status_idx" ON "stores" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "users" USING btree ("created_at");
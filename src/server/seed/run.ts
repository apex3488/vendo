import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  adPlacements,
  categories,
  categoryAttributeOptions,
  categoryAttributes,
  cities,
  contentPages,
  homeCollections,
  promotionPlans,
  regions,
  subscriptionPlans,
} from "../db/schema";
import { CATEGORY_TREE, type CatDef } from "./categories";
import { PAGES } from "./content";
import { REGIONS } from "./locations";

/**
 * Idempotent reference-data seed: locations, categories with attributes, default plans,
 * ad placements, content pages, home collections. Existing rows (matched by slug/code) are
 * left untouched so that admin edits are never overwritten.
 */
export async function seedReferenceData(db: Db) {
  // Locations
  for (const [ri, r] of REGIONS.entries()) {
    const [rs, ru, uz, en] = r.region;
    let [region] = await db.select().from(regions).where(eq(regions.slug, rs));
    if (!region) [region] = await db.insert(regions).values({ slug: rs, name: { ru, uz, en }, sort: ri }).returning();
    for (const [ci, c] of r.cities.entries()) {
      const [cs, cru, cuz, cen] = c;
      await db
        .insert(cities)
        .values({ slug: cs, regionId: region!.id, name: { ru: cru, uz: cuz, en: cen }, sort: ci })
        .onConflictDoNothing({ target: cities.slug });
    }
  }

  // Categories
  type Inherit = { types: ("sale" | "rent" | "service")[]; hasCondition: boolean; highValue: boolean };
  async function insertCat(def: CatDef, parentId: number | null, sort: number, inherit: Inherit) {
    const own: Inherit = {
      types: def.types ?? inherit.types,
      hasCondition: def.hasCondition ?? inherit.hasCondition,
      highValue: def.highValue ?? inherit.highValue,
    };
    let [cat] = await db.select().from(categories).where(eq(categories.slug, def.slug));
    if (!cat) {
      [cat] = await db
        .insert(categories)
        .values({
          slug: def.slug,
          parentId,
          name: { ru: def.name[0], uz: def.name[1], en: def.name[2] },
          icon: def.icon ?? null,
          sort,
          allowedTypes: own.types,
          hasCondition: own.hasCondition && !own.types.every((t) => t === "service"),
          highValue: own.highValue,
        })
        .returning();
      for (const [ai, a] of (def.attrs ?? []).entries()) {
        const [attr] = await db
          .insert(categoryAttributes)
          .values({
            categoryId: cat!.id,
            key: a.key,
            label: { ru: a.label[0], uz: a.label[1], en: a.label[2] },
            type: a.type,
            isRequired: a.required ?? false,
            isFilterable: a.filterable ?? false,
            unit: a.unit ?? null,
            minValue: a.min ?? null,
            maxValue: a.max ?? null,
            maxLength: a.maxLength ?? null,
            sort: ai,
          })
          .returning();
        if (a.options?.length) {
          await db.insert(categoryAttributeOptions).values(
            a.options.map(([value, ru, uz, en], oi) => ({ attributeId: attr!.id, value, label: { ru, uz, en }, sort: oi })),
          );
        }
      }
    }
    for (const [i, child] of (def.children ?? []).entries()) await insertCat(child, cat!.id, i, own);
  }
  for (const [i, def] of CATEGORY_TREE.entries()) {
    await insertCat(def, null, i * 10, { types: ["sale"], hasCondition: true, highValue: false });
  }
  // Real estate: prepared as a separate module, disabled until enabled by an admin.
  await db
    .insert(categories)
    .values({
      slug: "real-estate",
      name: { ru: "Недвижимость", uz: "Koʻchmas mulk", en: "Real estate" },
      icon: "building",
      sort: 95,
      isActive: false,
      allowedTypes: ["sale", "rent"],
      hasCondition: false,
      highValue: true,
    })
    .onConflictDoNothing({ target: categories.slug });

  // Store subscription plans. Prices are placeholders to be set by the owner in /admin/monetization.
  await db
    .insert(subscriptionPlans)
    .values([
      {
        code: "free",
        name: { ru: "Бесплатный", uz: "Bepul", en: "Free" },
        description: { ru: "Страница магазина и базовые инструменты", uz: "Doʻkon sahifasi va asosiy vositalar", en: "Store page and basic tools" },
        price: 0,
        periodDays: 30,
        listingLimit: 20,
        features: { storePage: true, analytics: false, customLogo: true },
        sort: 0,
      },
      {
        code: "business",
        name: { ru: "Бизнес", uz: "Biznes", en: "Business" },
        description: { ru: "Больше объявлений и статистика", uz: "Koʻproq eʼlonlar va statistika", en: "More listings and analytics" },
        price: 199000,
        periodDays: 30,
        listingLimit: 150,
        features: { storePage: true, analytics: true, customLogo: true, freeBumpsPerMonth: 5 },
        sort: 1,
      },
      {
        code: "pro",
        name: { ru: "Про", uz: "Pro", en: "Pro" },
        description: { ru: "Для крупных магазинов", uz: "Yirik doʻkonlar uchun", en: "For large stores" },
        price: 499000,
        periodDays: 30,
        listingLimit: 1000,
        features: { storePage: true, analytics: true, customLogo: true, freeBumpsPerMonth: 30 },
        sort: 2,
      },
    ])
    .onConflictDoNothing({ target: subscriptionPlans.code });

  await db
    .insert(promotionPlans)
    .values([
      { code: "bump_1", type: "bump", name: { ru: "Поднять в списке", uz: "Roʻyxatda koʻtarish", en: "Bump to top" }, description: { ru: "Объявление снова считается свежим и поднимается в сортировке «Новые»", uz: "Eʼlon yana yangi hisoblanadi va «Yangi» saralashida koʻtariladi", en: "The listing counts as fresh again and moves up in “Newest” sorting" }, price: 15000, durationDays: 1, sort: 0 },
      { code: "highlight_7", type: "highlight", name: { ru: "Выделение на 7 дней", uz: "7 kunga ajratish", en: "Highlight for 7 days" }, description: { ru: "Карточка выделяется цветом в каталоге", uz: "Kartochka katalogda rang bilan ajratiladi", en: "The card is visually highlighted in the catalog" }, price: 25000, durationDays: 7, sort: 1 },
      { code: "featured_7", type: "featured", name: { ru: "В подборке «Рекомендуем» на 7 дней", uz: "7 kunga «Tavsiya etamiz» toʻplamida", en: "In “Featured” for 7 days" }, description: { ru: "Показ в отдельной подборке на главной и в категории", uz: "Bosh sahifadagi va toifadagi alohida toʻplamda koʻrsatish", en: "Shown in a dedicated block on the home and category pages" }, price: 60000, durationDays: 7, sort: 2 },
    ])
    .onConflictDoNothing({ target: promotionPlans.code });

  await db
    .insert(adPlacements)
    .values([
      { code: "home_banner", name: "Главная — баннер под категориями", width: 1200, height: 200, description: "Широкий баннер на главной странице" },
      { code: "search_banner", name: "Поиск — баннер над результатами", width: 1200, height: 160, description: "Показывается в выдаче поиска и категорий" },
      { code: "listing_sidebar", name: "Объявление — боковой блок", width: 300, height: 250, description: "Рядом с карточкой продавца" },
    ])
    .onConflictDoNothing({ target: adPlacements.code });

  for (const p of PAGES) {
    await db
      .insert(contentPages)
      .values({ slug: p.slug, kind: p.kind, sort: p.sort, title: p.title, body: p.body })
      .onConflictDoNothing({ target: contentPages.slug });
  }

  await db
    .insert(homeCollections)
    .values([
      { code: "fresh", title: { ru: "Новые поступления", uz: "Yangi eʼlonlar", en: "New arrivals" }, filter: { sort: "new" }, sort: 0 },
      { code: "electronics", title: { ru: "Техника", uz: "Texnika", en: "Electronics" }, filter: { categorySlug: "electronics", sort: "new" }, sort: 1 },
      { code: "cars", title: { ru: "Автомобили", uz: "Avtomobillar", en: "Cars" }, filter: { categorySlug: "cars", sort: "new" }, sort: 2 },
      { code: "designer", title: { ru: "Брендовые вещи", uz: "Brend buyumlar", en: "Designer items" }, filter: { categorySlug: "vintage-designer", sort: "new" }, sort: 3 },
      { code: "rent", title: { ru: "Аренда", uz: "Ijara", en: "Rentals" }, filter: { type: "rent", sort: "new" }, sort: 4 },
      { code: "services", title: { ru: "Услуги", uz: "Xizmatlar", en: "Services" }, filter: { type: "service", sort: "new" }, sort: 5 },
      { code: "deals", title: { ru: "Выгодные предложения", uz: "Foydali takliflar", en: "Good deals" }, filter: { sort: "price_asc", categorySlug: "fashion" }, sort: 6 },
    ])
    .onConflictDoNothing({ target: homeCollections.code });
}

/**
 * DEVELOPMENT ONLY: creates clearly labelled test listings ("[ТЕСТ]") from a test seller,
 * so the UI can be checked with content. Never run against production.
 *   npm run db:demo         — create
 *   npm run db:demo:clear   — remove everything created by this script
 */
import sharp from "sharp";
import { eq, sql } from "drizzle-orm";
import { setDbForTests } from "../src/server/db";
import { categories, cities, listings, users } from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { saveListing } from "../src/server/services/listings";
import { getStorage, newKey } from "../src/server/storage";
import { listingImages } from "../src/server/db/schema";
import { openDb } from "./_db";

const DEMO_EMAIL = "demo-seller@vendo.test";

const ITEMS: { cat: string; title: string; price: number | null; cur?: "UZS" | "USD"; type?: "sale" | "rent" | "service"; cond?: "new" | "used" | "like_new"; period?: "day"; attrs: Record<string, string | string[] | boolean>; color: string }[] = [
  { cat: "smartphones", title: "[ТЕСТ] iPhone 13, 128 ГБ", price: 6_200_000, cond: "used", attrs: { manufacturer: "apple", model: "iPhone 13", storage: "128", color: "blue" }, color: "#2b4c7e" },
  { cat: "smartphones", title: "[ТЕСТ] Samsung Galaxy S23", price: 7_900_000, cond: "like_new", attrs: { manufacturer: "samsung", model: "Galaxy S23", storage: "256", color: "black" }, color: "#1d1f22" },
  { cat: "laptops-computers", title: "[ТЕСТ] Ноутбук для учёбы", price: 4_500_000, cond: "used", attrs: { brand: "Lenovo", ram_gb: "16" }, color: "#5a6270" },
  { cat: "cars", title: "[ТЕСТ] Chevrolet Cobalt 2021", price: 11_500, cur: "USD", cond: "used", attrs: { make: "chevrolet", model: "Cobalt", year: "2021", mileage: "38000", engine_type: "petrol", transmission: "automatic", body_type: "sedan" }, color: "#c7ccd1" },
  { cat: "bouquets", title: "[ТЕСТ] Букет из 25 роз", price: 450_000, attrs: { bouquet_type: "mono", bouquet_size: "m", in_stock: true, delivery: true }, color: "#b8324a" },
  { cat: "womens-clothing", title: "[ТЕСТ] Пальто шерстяное", price: 900_000, cond: "like_new", attrs: { brand: "Zara", size: "m", color: "beige", gender: "women" }, color: "#cdb89a" },
  { cat: "furniture", title: "[ТЕСТ] Диван угловой", price: 3_200_000, cond: "used", attrs: { color: "gray", delivery: true }, color: "#8a8f95" },
  { cat: "rent-photo-video", title: "[ТЕСТ] Аренда камеры Sony A7 III", price: 250_000, type: "rent", period: "day", attrs: { rental_terms: "Залог и паспорт" }, color: "#2a2a2a" },
  { cat: "web-development", title: "[ТЕСТ] Разработка сайтов под ключ", price: 3_000_000, type: "service", attrs: { work_format: "online", experience_years: "5" }, color: "#c6f24e" },
  { cat: "shoes", title: "[ТЕСТ] Кроссовки беговые", price: 650_000, cond: "new", attrs: { brand: "Nike", shoe_size: "42", gender: "men" }, color: "#e85d2a" },
];

async function placeholder(color: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="64" font-weight="700" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${label}</text><text x="50%" y="60%" font-family="Arial" font-size="36" fill="#ffffff" fill-opacity="0.7" text-anchor="middle">ТЕСТОВОЕ ФОТО</text></svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

async function main() {
  const { db, migrate, close } = await openDb();
  await migrate();
  setDbForTests(db);
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL));

  if (process.argv.includes("--clear")) {
    if (existing) await db.delete(users).where(eq(users.id, existing.id));
    console.log("Demo data removed.");
    await close();
    return;
  }
  if (existing) {
    console.log("Demo data already exists. Run `npm run db:demo:clear` first to recreate.");
    await close();
    return;
  }
  const [seller] = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, displayName: "Тестовый продавец (демо)", passwordHash: await hashPassword(crypto.randomUUID()), telegram: "vendo_demo_test" })
    .returning();
  const [city] = await db.select().from(cities).where(eq(cities.slug, "tashkent"));
  for (const it of ITEMS) {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, it.cat));
    const { id } = await saveListing(
      seller!.id,
      null,
      {
        categoryId: cat!.id,
        type: it.type ?? "sale",
        title: it.title,
        description: "Это тестовое объявление для проверки интерфейса VENDO. Оно не является реальным предложением и будет удалено перед запуском.",
        price: it.price,
        currency: it.cur ?? "UZS",
        pricePeriod: it.period ?? null,
        condition: it.cond ?? null,
        cityId: city!.id,
        phone: "+998 90 000 00 00",
        telegram: "@vendo_demo_test",
        attributes: it.attrs,
      },
      { submit: true },
    );
    const img = await placeholder(it.color, it.title.replace("[ТЕСТ] ", "").slice(0, 26));
    const key = newKey("listings");
    const thumbKey = key.replace(/\.webp$/, "-t.webp");
    await getStorage().put(key, img, "image/webp");
    await getStorage().put(thumbKey, await sharp(img).resize(600, 600, { fit: "cover" }).webp().toBuffer(), "image/webp");
    await db.insert(listingImages).values({ listingId: id, storageKey: key, thumbKey, width: 1200, height: 900, sort: 0 });
    await db
      .update(listings)
      .set({ status: "active", publishedAt: sql`now() - (random() * interval '3 days')`, rankedAt: sql`now() - (random() * interval '3 days')` })
      .where(eq(listings.id, id));
  }
  console.log(`Created ${ITEMS.length} test listings from "${DEMO_EMAIL}".`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

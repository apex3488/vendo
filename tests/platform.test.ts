import sharp from "sharp";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { listings, notifications, users } from "@/server/db/schema";
import { can } from "@/server/auth/permissions";
import { createSession, validateSessionToken } from "@/server/auth/sessions";
import { ServiceError } from "@/server/errors";
import { createCategory, deleteCategory, getAttributesForCategory, getCategoryTree } from "@/server/services/categories";
import { getFavoriteCards, toggleFavorite } from "@/server/services/engagement";
import { processImage } from "@/server/services/images";
import { ListingValidationError, moderateListing, ownerSetStatus, saveListing } from "@/server/services/listings";
import { adminActivatePromotion, requestPromotion } from "@/server/services/monetization";
import { adminListReports, createReport } from "@/server/services/reports";
import { searchListings } from "@/server/services/search";
import { authenticate, registerUser, setUserBlocked, setUserRole, upsertSuperAdmin } from "@/server/services/users";
import { categoryId, cityId, makeUser, setupTestDb } from "./setup-db";

let db: Awaited<ReturnType<typeof setupTestDb>>;
let city: number;
let phones: number;
let cars: number;

beforeAll(async () => {
  db = await setupTestDb();
  city = await cityId(db);
  phones = await categoryId(db, "smartphones");
  cars = await categoryId(db, "cars");
});

const phoneListing = (extra: Record<string, unknown> = {}) => ({
  categoryId: phones,
  type: "sale" as const,
  title: "iPhone 13 128 ГБ синий",
  description: "Отличное состояние, полный комплект, батарея 89%.",
  price: 6_500_000,
  currency: "UZS" as const,
  condition: "used" as const,
  cityId: city,
  phone: "+998 90 123 45 67",
  telegram: "@seller_test",
  attributes: { manufacturer: "apple", model: "iPhone 13", storage: "128", color: "blue" },
  ...extra,
});

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code);
}

describe("authentication", () => {
  it("registers, logs in and rejects a wrong password", async () => {
    const u = await registerUser({ displayName: "Aziz", email: "Aziz@Example.com", password: "secret-pass-1" });
    expect((await authenticate("aziz@example.com", "secret-pass-1")).id).toBe(u.id);
    await expectCode(authenticate("aziz@example.com", "wrong-password"), "invalid_credentials");
    await expectCode(registerUser({ displayName: "Dup", email: "aziz@example.com", password: "secret-pass-1" }), "email_taken");
  });

  it("creates sessions that stop working when the user is blocked", async () => {
    const admin = await makeUser(db, "admin");
    const u = await makeUser(db);
    const { token } = await createSession(db, u.id);
    expect((await validateSessionToken(db, token))?.id).toBe(u.id);
    await setUserBlocked({ id: admin.id, role: "admin" }, u.id, true, "spam");
    expect(await validateSessionToken(db, token)).toBeNull();
    await expectCode(authenticate(u.email!, "password123"), "account_blocked");
  });

  it("bootstraps the super admin by username without storing the raw password", async () => {
    const res = await upsertSuperAdmin("boot_admin", "Very-Secret-1");
    const [row] = await db.select().from(users).where(eq(users.id, res.id));
    expect(row!.role).toBe("super_admin");
    expect(row!.passwordHash).not.toContain("Very-Secret-1");
    expect((await authenticate("boot_admin", "Very-Secret-1")).id).toBe(res.id);
  });
});

describe("categories and attributes", () => {
  it("loads the category tree and inherited attributes from the database", async () => {
    const tree = await getCategoryTree();
    expect(tree.map((c) => c.slug)).toContain("electronics");
    expect(tree.map((c) => c.slug)).not.toContain("real-estate"); // disabled module
    const attrs = await getAttributesForCategory(phones);
    expect(attrs.map((a) => a.key)).toEqual(expect.arrayContaining(["manufacturer", "model", "storage"]));
  });

  it("refuses to delete a category with listings unless they are moved", async () => {
    const owner = await makeUser(db);
    const temp = await createCategory({ parentId: null, name: { ru: "Временная" }, slug: "temp-cat", allowedTypes: ["sale"], sort: 0 });
    await saveListing(owner.id, null, { ...phoneListing(), categoryId: temp.id, attributes: {} }, { submit: true });
    await expectCode(deleteCategory(temp.id), "category_has_listings");
    const other = await categoryId(db, "other");
    expect((await deleteCategory(temp.id, other)).moved).toBe(1);
  });
});

describe("listings", () => {
  it("saves a listing in the database and sends it to moderation", async () => {
    const u = await makeUser(db);
    const res = await saveListing(u.id, null, phoneListing(), { submit: true });
    expect(res.status).toBe("pending");
    const [row] = await db.select().from(listings).where(eq(listings.id, res.id));
    expect(row!.phone).toBe("+998901234567");
    expect(row!.telegram).toBe("seller_test");
  });

  it("notifies moderators (not regular users) when a listing enters the queue", async () => {
    const owner = await makeUser(db);
    const mod = await makeUser(db, "moderator");
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    const modNotes = await db.select().from(notifications).where(eq(notifications.userId, mod.id));
    expect(modNotes.some((n) => n.type === "listing_pending_review" && n.link === `/admin/listings/${id}`)).toBe(true);
    const ownerNotes = await db.select().from(notifications).where(eq(notifications.userId, owner.id));
    expect(ownerNotes.some((n) => n.type === "listing_pending_review")).toBe(false);
  });

  it("re-syncs the Super Admin password from the environment on deploy", async () => {
    const { ensureSuperAdmin } = await import("@/server/services/users");
    await upsertSuperAdmin("deploy_admin", "first-password-1");
    expect((await ensureSuperAdmin("deploy_admin", "first-password-1")).updated).toBe(false);
    expect((await ensureSuperAdmin("deploy_admin", "second-password-2")).updated).toBe(true);
    await expect(authenticate("deploy_admin", "second-password-2")).resolves.toMatchObject({ role: "super_admin" });
  });

  it("validates required category attributes and contacts", async () => {
    const u = await makeUser(db);
    try {
      await saveListing(u.id, null, phoneListing({ attributes: { color: "blue" }, phone: "", telegram: "" }), { submit: true });
      throw new Error("should fail");
    } catch (e) {
      expect(e).toBeInstanceOf(ListingValidationError);
      const fe = (e as ListingValidationError).fieldErrors;
      expect(fe["attr.manufacturer"]).toBe("required");
      expect(fe.phone).toBe("contact_required");
    }
    await expect(saveListing(u.id, null, phoneListing({ telegram: "javascript:alert(1)" }), { submit: true })).rejects.toBeInstanceOf(ListingValidationError);
  });

  it("does not let a seller edit or archive someone else's listing", async () => {
    const owner = await makeUser(db);
    const intruder = await makeUser(db);
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    await expectCode(saveListing(intruder.id, id, phoneListing({ title: "Hacked title!!" }), { submit: false }), "not_found");
    await expectCode(ownerSetStatus(intruder.id, id, "archive"), "not_found");
  });

  it("edits, approves, archives and republishes", async () => {
    const owner = await makeUser(db);
    const mod = await makeUser(db, "moderator");
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    await moderateListing({ id: mod.id, role: "moderator" }, id, "approve");
    await saveListing(owner.id, id, phoneListing({ price: 6_000_000 }), { submit: true });
    let [row] = await db.select().from(listings).where(eq(listings.id, id));
    expect(row!.price).toBe(6_000_000);
    expect(row!.status).toBe("pending"); // edits go back to moderation
    await moderateListing({ id: mod.id, role: "moderator" }, id, "approve");
    await ownerSetStatus(owner.id, id, "archive");
    [row] = await db.select().from(listings).where(eq(listings.id, id));
    expect(row!.status).toBe("archived");
    await ownerSetStatus(owner.id, id, "republish");
    [row] = await db.select().from(listings).where(eq(listings.id, id));
    expect(row!.status).toBe("pending");
  });
});

describe("roles and moderation", () => {
  it("lets moderators moderate but not support", async () => {
    const owner = await makeUser(db);
    const support = await makeUser(db, "support");
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    await expectCode(moderateListing({ id: support.id, role: "support" }, id, "approve"), "forbidden");
    await expectCode(moderateListing({ id: owner.id, role: "user" }, id, "approve"), "forbidden");
    const mod = await makeUser(db, "moderator");
    await expectCode(moderateListing({ id: mod.id, role: "moderator" }, id, "reject"), "invalid_input"); // reason required
    await moderateListing({ id: mod.id, role: "moderator" }, id, "reject", "Неверная категория");
    const [row] = await db.select().from(listings).where(eq(listings.id, id));
    expect(row!.status).toBe("rejected");
    expect(row!.rejectionReason).toBe("Неверная категория");
  });

  it("keeps Super Admin powers away from moderators and admins", async () => {
    const target = await makeUser(db);
    const mod = await makeUser(db, "moderator");
    const admin = await makeUser(db, "admin");
    const superAdmin = await makeUser(db, "super_admin");
    expect(can("moderator", "settings.manage")).toBe(false);
    expect(can("moderator", "users.assign_staff_role")).toBe(false);
    expect(can("admin", "settings.manage")).toBe(false);
    await expectCode(setUserRole({ id: mod.id, role: "moderator" }, target.id, "admin"), "forbidden");
    await expectCode(setUserRole({ id: admin.id, role: "admin" }, target.id, "super_admin"), "forbidden");
    await expectCode(setUserRole({ id: admin.id, role: "admin" }, admin.id, "super_admin"), "forbidden");
    await setUserRole({ id: admin.id, role: "admin" }, target.id, "moderator");
    await setUserRole({ id: superAdmin.id, role: "super_admin" }, target.id, "admin");
    const [row] = await db.select().from(users).where(eq(users.id, target.id));
    expect(row!.role).toBe("admin");
  });
});

describe("search", () => {
  it("filters by text, category, price and attributes on the server", async () => {
    const owner = await makeUser(db);
    const mod = { id: (await makeUser(db, "moderator")).id, role: "moderator" as const };
    const a = await saveListing(owner.id, null, phoneListing({ title: "Samsung Galaxy S23 Ultra", attributes: { manufacturer: "samsung", model: "S23", storage: "256" }, price: 9_000_000 }), { submit: true });
    const b = await saveListing(
      owner.id,
      null,
      {
        categoryId: cars,
        type: "sale",
        title: "Chevrolet Cobalt 2020 автомат",
        description: "Один владелец, обслуживание у дилера, без ДТП.",
        price: 12_000,
        currency: "USD",
        condition: "used",
        cityId: city,
        phone: "+998901112233",
        attributes: { make: "chevrolet", model: "Cobalt", year: "2020", mileage: "45000", transmission: "automatic" },
      },
      { submit: true },
    );
    await moderateListing(mod, a.id, "approve");
    await moderateListing(mod, b.id, "approve");

    const byText = await searchListings({ q: "galax" });
    expect(byText.items.map((i) => i.id)).toContain(a.id);
    expect(byText.items.map((i) => i.id)).not.toContain(b.id);

    const byCategory = await searchListings({ categorySlug: "transport" });
    expect(byCategory.items.map((i) => i.id)).toEqual([b.id]);

    const byYear = await searchListings({ categorySlug: "cars", attrs: { year: ["2019..2021"], transmission: ["automatic"] } });
    expect(byYear.items.map((i) => i.id)).toEqual([b.id]);
    const wrongYear = await searchListings({ categorySlug: "cars", attrs: { year: ["2021.."] } });
    expect(wrongYear.total).toBe(0);

    const byPrice = await searchListings({ categorySlug: "smartphones", minPrice: 8_000_000, currency: "UZS" });
    expect(byPrice.items.map((i) => i.id)).toEqual([a.id]);

    const pending = await saveListing(owner.id, null, phoneListing({ title: "Galaxy pending only" }), { submit: true });
    expect((await searchListings({ q: "pending only" })).items.map((i) => i.id)).not.toContain(pending.id);
  });
});

describe("favorites, reports and paid features", () => {
  it("persists favorites", async () => {
    const owner = await makeUser(db);
    const buyer = await makeUser(db);
    const mod = await makeUser(db, "moderator");
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    await moderateListing({ id: mod.id, role: "moderator" }, id, "approve");
    expect(await toggleFavorite(buyer.id, id)).toBe(true);
    expect((await getFavoriteCards(buyer.id)).map((c) => c.id)).toContain(id);
    expect(await toggleFavorite(buyer.id, id)).toBe(false);
    expect(await getFavoriteCards(buyer.id)).toHaveLength(0);
  });

  it("stores reports and shows them in the admin queue", async () => {
    const owner = await makeUser(db);
    const reporter = await makeUser(db);
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    await createReport(reporter.id, { targetType: "listing", listingId: id, reason: "fraud", details: "Просит предоплату" });
    await expectCode(createReport(reporter.id, { targetType: "listing", listingId: id, reason: "fraud" }), "already_reported");
    const queue = await adminListReports({ status: "open", page: 1 });
    expect(queue.items.some((r) => r.r.listingId === id && r.r.reason === "fraud")).toBe(true);
  });

  it("does not activate paid promotion without a confirmed basis", async () => {
    const owner = await makeUser(db);
    const mod = await makeUser(db, "moderator");
    const admin = await makeUser(db, "admin");
    const { id } = await saveListing(owner.id, null, phoneListing(), { submit: true });
    await moderateListing({ id: mod.id, role: "moderator" }, id, "approve");
    const plan = (await db.query.promotionPlans.findFirst({ where: (p, { eq: e }) => e(p.code, "featured_7") }))!;
    const promoId = await requestPromotion(owner.id, id, plan.id);
    let [row] = await db.select().from(listings).where(eq(listings.id, id));
    expect(row!.featuredUntil).toBeNull();
    expect((await searchListings({ featuredOnly: true })).items.map((i) => i.id)).not.toContain(id);
    await expectCode(adminActivatePromotion({ id: admin.id, role: "admin" }, promoId, ""), "invalid_input");
    await adminActivatePromotion({ id: admin.id, role: "admin" }, promoId, "Перевод №123 получен");
    [row] = await db.select().from(listings).where(eq(listings.id, id));
    expect(row!.featuredUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("images", () => {
  it("rejects files that are not images and re-encodes real ones", async () => {
    await expectCode(processImage(Buffer.from("<html>not an image</html>"), 5_000_000), "image_invalid");
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#c6f24e" } })
      .png()
      .withMetadata({ exif: { IFD0: { Copyright: "secret-gps" } } })
      .toBuffer();
    const out = await processImage(png, 5_000_000);
    expect(out.width).toBe(1600);
    const meta = await sharp(out.full).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    await expectCode(processImage(png, 10), "image_too_large");
  });
});

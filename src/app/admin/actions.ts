"use server";

/**
 * Admin server actions. Every action re-checks the caller's permission against the database
 * (requirePermission) — hiding buttons in the UI is never relied upon.
 */
import { revalidatePath } from "next/cache";
import { toActionError } from "@/server/action-utils";
import { requirePermission } from "@/server/auth/current";
import type { Role } from "@/server/auth/permissions";
import type { ActionResult } from "@/server/errors";
import { audit } from "@/server/services/audit";
import {
  createAttribute,
  createCategory,
  createOption,
  deleteAttribute,
  deleteCategory,
  deleteOption,
  updateAttribute,
  updateCategory,
} from "@/server/services/categories";
import { deleteCollection, deletePage, upsertCollection, upsertPage } from "@/server/services/content";
import { moderateListing, type ModerationDecision } from "@/server/services/listings";
import {
  adminActivatePromotion,
  adminActivateSubscription,
  adminCancelPromotion,
  adminCancelSubscription,
  upsertCampaign,
  upsertPlacement,
  upsertPromotionPlan,
  upsertSubscriptionPlan,
} from "@/server/services/monetization";
import { resolveReport } from "@/server/services/reports";
import { updateSettings, SETTINGS_DEFAULTS, type Settings } from "@/server/services/settings";
import { adminSetStoreStatus, adminSetStoreVerified } from "@/server/services/stores";
import { setUserBlocked, setUserRole } from "@/server/services/users";
import { getStorage, newKey } from "@/server/storage";
import { processImage } from "@/server/services/images";

const ok = (message = "Сохранено"): ActionResult => ({ ok: true, message });
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optNum = (f: FormData, k: string) => (str(f, k) === "" ? null : Number(str(f, k)));
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const i18n = (f: FormData, k: string) => ({ ru: str(f, `${k}_ru`), uz: str(f, `${k}_uz`) || undefined, en: str(f, `${k}_en`) || undefined });

// ---------------------------------------------------------------------------
// Listings & reports
// ---------------------------------------------------------------------------

export async function moderateListingAction(listingId: number, decision: ModerationDecision, reason: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("listings.moderate");
    await moderateListing(actor, Number(listingId), decision, reason);
    revalidatePath("/admin/listings");
    return ok("Готово");
  } catch (e) {
    return toActionError(e);
  }
}

export async function resolveReportAction(reportId: number, status: "resolved" | "dismissed", resolution: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("reports.handle");
    await resolveReport(actor, Number(reportId), status, resolution);
    revalidatePath("/admin/reports");
    return ok("Жалоба обработана");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function setUserBlockedAction(userId: string, blocked: boolean, reason: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("users.block");
    await setUserBlocked(actor, userId, blocked, reason);
    revalidatePath(`/admin/users/${userId}`);
    return ok(blocked ? "Пользователь заблокирован" : "Пользователь разблокирован");
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUserRoleAction(userId: string, role: Role): Promise<ActionResult> {
  try {
    const actor = await requirePermission("users.assign_staff_role");
    await setUserRole(actor, userId, role);
    revalidatePath(`/admin/users/${userId}`);
    return ok("Роль изменена");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function categoryFromForm(f: FormData) {
  return {
    parentId: optNum(f, "parentId"),
    slug: str(f, "slug"),
    name: i18n(f, "name"),
    icon: str(f, "icon") || null,
    sort: Number(str(f, "sort") || 0),
    isActive: bool(f, "isActive"),
    allowedTypes: f.getAll("allowedTypes").map(String) as ("sale" | "rent" | "service")[],
    hasCondition: bool(f, "hasCondition"),
    highValue: bool(f, "highValue"),
    seoTitle: i18n(f, "seoTitle"),
    seoDescription: i18n(f, "seoDescription"),
  };
}

export async function saveCategoryAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    const actor = await requirePermission("categories.manage");
    const data = categoryFromForm(f);
    const row = id ? await updateCategory(id, data) : await createCategory(data);
    await audit({ actorId: actor.id, action: id ? "category.update" : "category.create", entityType: "category", entityId: row.id, meta: { slug: row.slug } });
    revalidatePath("/admin/categories");
    return { ok: true, message: "Категория сохранена", data: { id: row.id } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteCategoryAction(id: number, moveTo: number | null): Promise<ActionResult> {
  try {
    const actor = await requirePermission("categories.manage");
    const res = await deleteCategory(Number(id), moveTo ? Number(moveTo) : null);
    await audit({ actorId: actor.id, action: "category.delete", entityType: "category", entityId: id, meta: { movedListings: res.moved, moveTo } });
    revalidatePath("/admin/categories");
    return ok("Категория удалена");
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveAttributeAction(categoryId: number, attributeId: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("categories.manage");
    const data = {
      key: str(f, "key"),
      label: i18n(f, "label"),
      type: str(f, "type") as "text",
      isRequired: bool(f, "isRequired"),
      isFilterable: bool(f, "isFilterable"),
      unit: str(f, "unit") || null,
      minValue: optNum(f, "minValue"),
      maxValue: optNum(f, "maxValue"),
      maxLength: optNum(f, "maxLength"),
      sort: Number(str(f, "sort") || 0),
    };
    const row = attributeId ? await updateAttribute(attributeId, data) : await createAttribute(categoryId, data);
    await audit({ actorId: actor.id, action: attributeId ? "attribute.update" : "attribute.create", entityType: "category_attribute", entityId: row.id, meta: { categoryId, key: row.key } });
    revalidatePath(`/admin/categories/${categoryId}`);
    return ok("Характеристика сохранена");
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteAttributeAction(categoryId: number, attributeId: number): Promise<ActionResult> {
  try {
    const actor = await requirePermission("categories.manage");
    await deleteAttribute(Number(attributeId));
    await audit({ actorId: actor.id, action: "attribute.delete", entityType: "category_attribute", entityId: attributeId, meta: { categoryId } });
    revalidatePath(`/admin/categories/${categoryId}`);
    return ok("Удалено");
  } catch (e) {
    return toActionError(e);
  }
}

export async function addOptionAction(categoryId: number, attributeId: number, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    await requirePermission("categories.manage");
    await createOption(attributeId, { value: str(f, "value"), label: i18n(f, "label"), sort: Number(str(f, "sort") || 0) });
    revalidatePath(`/admin/categories/${categoryId}`);
    return ok("Вариант добавлен");
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteOptionAction(categoryId: number, optionId: number): Promise<ActionResult> {
  try {
    await requirePermission("categories.manage");
    await deleteOption(Number(optionId));
    revalidatePath(`/admin/categories/${categoryId}`);
    return ok("Удалено");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export async function setStoreStatusAction(storeId: number, status: "active" | "suspended"): Promise<ActionResult> {
  try {
    const actor = await requirePermission("stores.manage");
    await adminSetStoreStatus(actor, Number(storeId), status);
    revalidatePath("/admin/stores");
    return ok();
  } catch (e) {
    return toActionError(e);
  }
}

export async function setStoreVerifiedAction(storeId: number, verified: boolean): Promise<ActionResult> {
  try {
    const actor = await requirePermission("stores.verify");
    await adminSetStoreVerified(actor, Number(storeId), verified);
    revalidatePath("/admin/stores");
    return ok();
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Monetization
// ---------------------------------------------------------------------------

export async function saveSubscriptionPlanAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("monetization.manage");
    await upsertSubscriptionPlan(actor.id, id, {
      code: str(f, "code"),
      name: i18n(f, "name"),
      description: i18n(f, "description"),
      price: Number(str(f, "price") || 0),
      currency: str(f, "currency") === "USD" ? "USD" : "UZS",
      periodDays: Number(str(f, "periodDays") || 30),
      listingLimit: Number(str(f, "listingLimit") || 0),
      features: {
        analytics: bool(f, "analytics"),
        storePage: bool(f, "storePage"),
        customLogo: bool(f, "customLogo"),
        freeBumpsPerMonth: Number(str(f, "freeBumpsPerMonth") || 0),
      },
      isActive: bool(f, "isActive"),
      sort: Number(str(f, "sort") || 0),
    });
    revalidatePath("/admin/monetization");
    return ok("Тариф сохранён");
  } catch (e) {
    return toActionError(e);
  }
}

export async function savePromotionPlanAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("monetization.manage");
    await upsertPromotionPlan(actor.id, id, {
      code: str(f, "code"),
      type: str(f, "type") as "bump",
      name: i18n(f, "name"),
      description: i18n(f, "description"),
      price: Number(str(f, "price") || 0),
      currency: str(f, "currency") === "USD" ? "USD" : "UZS",
      durationDays: Number(str(f, "durationDays") || 1),
      categoryIds: str(f, "categoryIds")
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((x) => Number.isInteger(x) && x > 0),
      isActive: bool(f, "isActive"),
      sort: Number(str(f, "sort") || 0),
    });
    revalidatePath("/admin/monetization");
    return ok("Тариф продвижения сохранён");
  } catch (e) {
    return toActionError(e);
  }
}

export async function activatePromotionAction(id: number, note: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("monetization.manage");
    await adminActivatePromotion(actor, Number(id), note);
    revalidatePath("/admin/monetization");
    return ok("Продвижение активировано");
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelPromotionAdminAction(id: number): Promise<ActionResult> {
  try {
    const actor = await requirePermission("monetization.manage");
    await adminCancelPromotion(actor, Number(id));
    revalidatePath("/admin/monetization");
    return ok("Отменено");
  } catch (e) {
    return toActionError(e);
  }
}

export async function activateSubscriptionAction(id: number, note: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("monetization.manage");
    await adminActivateSubscription(actor, Number(id), note);
    revalidatePath("/admin/monetization");
    return ok("Подписка активирована");
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelSubscriptionAction(id: number): Promise<ActionResult> {
  try {
    const actor = await requirePermission("monetization.manage");
    await adminCancelSubscription(actor, Number(id));
    revalidatePath("/admin/monetization");
    return ok("Отменено");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------

export async function savePlacementAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("ads.manage");
    await upsertPlacement(actor.id, id, {
      code: str(f, "code"),
      name: str(f, "name"),
      description: str(f, "description") || null,
      width: Number(str(f, "width")),
      height: Number(str(f, "height")),
      isActive: bool(f, "isActive"),
    });
    revalidatePath("/admin/ads");
    return ok("Рекламное место сохранено");
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveCampaignAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("ads.manage");
    let imageKey: string | undefined;
    const image = f.get("image");
    if (image instanceof File && image.size > 0) {
      const img = await processImage(Buffer.from(await image.arrayBuffer()), 2 * 1024 * 1024);
      imageKey = newKey("ads");
      await getStorage().put(imageKey, img.full, "image/webp");
    }
    await upsertCampaign(
      actor.id,
      id,
      {
        placementId: Number(str(f, "placementId")),
        advertiser: str(f, "advertiser"),
        title: str(f, "title"),
        targetUrl: str(f, "targetUrl"),
        categoryId: optNum(f, "categoryId"),
        startsAt: str(f, "startsAt"),
        endsAt: str(f, "endsAt"),
        status: str(f, "status") as "draft",
      },
      imageKey,
    );
    revalidatePath("/admin/ads");
    return ok("Кампания сохранена");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export async function savePageAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("content.manage");
    const row = await upsertPage(id, {
      slug: str(f, "slug"),
      kind: str(f, "kind") === "faq" ? "faq" : "page",
      title: i18n(f, "title"),
      body: { ru: String(f.get("body_ru") ?? ""), uz: String(f.get("body_uz") ?? "") || undefined, en: String(f.get("body_en") ?? "") || undefined },
      isPublished: bool(f, "isPublished"),
      sort: Number(str(f, "sort") || 0),
    });
    await audit({ actorId: actor.id, action: id ? "page.update" : "page.create", entityType: "content_page", entityId: row.id, meta: { slug: row.slug } });
    revalidatePath("/admin/content");
    revalidatePath(`/p/${row.slug}`);
    return ok("Страница сохранена");
  } catch (e) {
    return toActionError(e);
  }
}

export async function deletePageAction(id: number): Promise<ActionResult> {
  try {
    const actor = await requirePermission("content.manage");
    await deletePage(Number(id));
    await audit({ actorId: actor.id, action: "page.delete", entityType: "content_page", entityId: id });
    revalidatePath("/admin/content");
    return ok("Удалено");
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveCollectionAction(id: number | null, _: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("content.manage");
    const type = str(f, "type");
    const sort = str(f, "sortOrder");
    const row = await upsertCollection(id, {
      code: str(f, "code"),
      title: i18n(f, "title"),
      filter: {
        categorySlug: str(f, "categorySlug") || undefined,
        type: type === "sale" || type === "rent" || type === "service" ? type : undefined,
        sort: sort === "price_asc" || sort === "price_desc" || sort === "popular" ? sort : "new",
        maxPrice: optNum(f, "maxPrice") ?? undefined,
        q: str(f, "q") || undefined,
      },
      isActive: bool(f, "isActive"),
      sort: Number(str(f, "sort") || 0),
    });
    await audit({ actorId: actor.id, action: id ? "collection.update" : "collection.create", entityType: "home_collection", entityId: row.id });
    revalidatePath("/admin/content");
    revalidatePath("/");
    return ok("Подборка сохранена");
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteCollectionAction(id: number): Promise<ActionResult> {
  try {
    const actor = await requirePermission("content.manage");
    await deleteCollection(Number(id));
    await audit({ actorId: actor.id, action: "collection.delete", entityType: "home_collection", entityId: id });
    revalidatePath("/admin/content");
    return ok("Удалено");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------------------
// Settings (Super Admin only)
// ---------------------------------------------------------------------------

export async function saveSettingsAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  try {
    const actor = await requirePermission("settings.manage");
    const int = (k: keyof Settings, min: number, max: number) => {
      const n = Math.round(Number(str(f, k)));
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : (SETTINGS_DEFAULTS[k] as number);
    };
    const tg = str(f, "supportTelegram").replace(/^@/, "");
    const patch: Partial<Settings> = {
      premoderation: bool(f, "premoderation"),
      freeActiveListings: int("freeActiveListings", 0, 100000),
      listingsPerDay: int("listingsPerDay", 1, 10000),
      maxImagesPerListing: int("maxImagesPerListing", 1, 30),
      maxImageMb: int("maxImageMb", 1, 15),
      listingTtlDays: int("listingTtlDays", 1, 3650),
      supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(f, "supportEmail")) ? str(f, "supportEmail") : "",
      supportTelegram: /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tg) ? tg : "",
      manualPaymentInstructions: str(f, "manualPaymentInstructions").slice(0, 1000),
    };
    await updateSettings(patch, actor.id);
    await audit({ actorId: actor.id, action: "settings.update", entityType: "settings", meta: patch as Record<string, unknown> });
    revalidatePath("/", "layout");
    return ok("Настройки сохранены");
  } catch (e) {
    return toActionError(e);
  }
}

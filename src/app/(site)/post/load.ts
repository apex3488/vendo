import "server-only";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import type { WizardCategory, WizardInitial } from "@/components/post/listing-wizard";
import { getAllCategories } from "@/server/services/categories";
import { getListingAttributeForm, getListingImages, getListingLimit, getOwnedListing } from "@/server/services/listings";
import { getRegionsWithCities } from "@/server/services/locations";
import { getSettings } from "@/server/services/settings";
import { getProfile } from "@/server/services/users";
import { mediaUrl } from "@/server/storage";
import { countUserListingsByStatus } from "@/server/services/listings";

export async function loadWizard(userId: string, listingId: number | null) {
  const [{ locale }, all, regions, settings, profile, counts, limit] = await Promise.all([
    getI18n(),
    getAllCategories(),
    getRegionsWithCities(),
    getSettings(),
    getProfile(userId),
    countUserListingsByStatus(userId),
    getListingLimit(userId),
  ]);
  const active = all.filter((c) => c.isActive);
  const activeIds = new Set(active.map((c) => c.id));
  const categories: WizardCategory[] = active
    .filter((c) => c.parentId == null || activeIds.has(c.parentId))
    .map((c) => ({
      id: c.id,
      parentId: c.parentId,
      name: tr(c.name, locale),
      allowedTypes: c.allowedTypes,
      hasCondition: c.hasCondition,
      isLeaf: !active.some((x) => x.parentId === c.id),
    }));

  let initial: WizardInitial = {
    id: null,
    status: null,
    categoryId: null,
    type: "sale",
    title: "",
    description: "",
    price: "",
    priceMax: "",
    currency: "UZS",
    pricePeriod: "",
    deposit: "",
    isNegotiable: false,
    condition: "",
    cityId: profile?.cityId ?? null,
    phone: profile?.phone ?? "",
    telegram: profile?.telegram ?? "",
    hidePhone: true,
    attributes: {},
    images: [],
  };

  if (listingId) {
    const l = await getOwnedListing(listingId, userId);
    const [attrs, imgs] = await Promise.all([getListingAttributeForm(l.id), getListingImages(l.id)]);
    initial = {
      id: l.id,
      status: l.status,
      categoryId: l.categoryId,
      type: l.type,
      title: l.title,
      description: l.description,
      price: l.price != null ? String(l.price) : "",
      priceMax: l.priceMax != null ? String(l.priceMax) : "",
      currency: l.currency === "USD" ? "USD" : "UZS",
      pricePeriod: l.pricePeriod ?? "",
      deposit: l.deposit != null ? String(l.deposit) : "",
      isNegotiable: l.isNegotiable,
      condition: l.condition ?? "",
      cityId: l.cityId,
      phone: l.phone ?? "",
      telegram: l.telegram ?? "",
      hidePhone: l.hidePhone,
      attributes: attrs,
      images: imgs.map((i) => ({ id: i.id, url: mediaUrl(i.storageKey)!, thumb: mediaUrl(i.thumbKey)! })),
    };
  }

  return {
    categories,
    regions: regions.map((r) => ({ id: r.id, name: tr(r.name, locale), cities: r.cities.map((c) => ({ id: c.id, name: tr(c.name, locale) })) })),
    limits: {
      maxImages: settings.maxImagesPerListing,
      maxMb: settings.maxImageMb,
      used: (counts.active ?? 0) + (counts.pending ?? 0),
      limit,
      premoderation: settings.premoderation,
    },
    initial,
  };
}

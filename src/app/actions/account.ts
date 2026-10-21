"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { getI18n } from "@/lib/i18n/server";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { cookies } from "next/headers";
import { toActionError } from "@/server/action-utils";
import { requireUser } from "@/server/auth/current";
import { ServiceError, type ActionResult } from "@/server/errors";
import { cancelPromotionRequest, requestPromotion, requestSubscription } from "@/server/services/monetization";
import { markAllRead } from "@/server/services/notifications";
import { enforce } from "@/server/services/rate-limit";
import { getStoreByOwner, saveStore } from "@/server/services/stores";
import { changePassword, updateProfile } from "@/server/services/users";
import { getStorage, newKey } from "@/server/storage";
import { processImage } from "@/server/services/images";

export async function updateProfileAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const user = await requireUser();
    const locale = String(form.get("locale") ?? "ru");
    await updateProfile(user.id, {
      displayName: String(form.get("displayName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      telegram: String(form.get("telegram") ?? ""),
      showPhone: form.get("showPhone") === "on",
      cityId: form.get("cityId") ? Number(form.get("cityId")) : null,
      locale,
    });
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
    revalidatePath("/", "layout");
    return { ok: true, message: t.account.profileSaved };
  } catch (e) {
    return toActionError(e);
  }
}

export async function changePasswordAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const user = await requireUser();
    await enforce(`chpw:${user.id}`, 10, 3600);
    await changePassword(user.id, String(form.get("currentPassword") ?? ""), String(form.get("newPassword") ?? ""));
    return { ok: true, message: t.account.passwordChanged };
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveStoreAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const user = await requireUser();
    await enforce(`store:${user.id}`, 30, 3600);
    let logoKey: string | undefined;
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const img = await processImage(Buffer.from(await logo.arrayBuffer()), 2 * 1024 * 1024);
      const square = await sharp(img.full).resize(320, 320, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
      logoKey = newKey("logos");
      await getStorage().put(logoKey, square, "image/webp");
      const old = await getStoreByOwner(user.id);
      if (old?.logoKey) await getStorage().remove([old.logoKey]);
    }
    await saveStore(
      user.id,
      {
        name: String(form.get("name") ?? ""),
        slug: String(form.get("slug") ?? ""),
        description: String(form.get("description") ?? ""),
        phone: String(form.get("phone") ?? ""),
        telegram: String(form.get("telegram") ?? ""),
        cityId: form.get("cityId") ? Number(form.get("cityId")) : null,
      },
      logoKey,
    );
    revalidatePath("/account/store");
    return { ok: true, message: t.store.saved };
  } catch (e) {
    return toActionError(e);
  }
}

export async function requestSubscriptionAction(planId: number): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const user = await requireUser();
    await enforce(`sub-req:${user.id}`, 10, 3600);
    await requestSubscription(user.id, Number(planId));
    revalidatePath("/account/subscription");
    return { ok: true, message: t.plans.requested };
  } catch (e) {
    return toActionError(e);
  }
}

export async function requestPromotionAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const user = await requireUser();
    await enforce(`promo-req:${user.id}`, 30, 3600);
    const listingId = Number(form.get("listingId"));
    const planId = Number(form.get("planId"));
    if (!listingId || !planId) throw new ServiceError("invalid_input");
    await requestPromotion(user.id, listingId, planId);
    revalidatePath("/account/promotions");
    return { ok: true, message: t.promo.created };
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelPromotionAction(id: number): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await cancelPromotionRequest(user.id, Number(id));
    revalidatePath("/account/promotions");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/account/notifications");
}

"use server";

import { getI18n } from "@/lib/i18n/server";
import { clientIpHash, toActionError } from "@/server/action-utils";
import { getCurrentUser, requireUser } from "@/server/auth/current";
import type { ActionResult } from "@/server/errors";
import { getListingById } from "@/server/services/listings";
import { toggleFavorite, trackEvent } from "@/server/services/engagement";
import { enforce, hit } from "@/server/services/rate-limit";
import { createReport } from "@/server/services/reports";

export async function toggleFavoriteAction(listingId: number): Promise<ActionResult<{ favorite: boolean }>> {
  try {
    const user = await requireUser();
    await enforce(`fav:${user.id}`, 120, 3600);
    const favorite = await toggleFavorite(user.id, Number(listingId));
    return { ok: true, data: { favorite } };
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * Reveals the seller's phone after an explicit user action. Rate-limited per visitor to make
 * bulk scraping of contacts impractical. The event is counted in daily aggregates only.
 */
export async function revealPhoneAction(listingId: number): Promise<ActionResult<{ phone: string }>> {
  try {
    const ip = await clientIpHash();
    const user = await getCurrentUser();
    await enforce(`reveal:${user?.id ?? ip}`, user ? 60 : 20, 3600);
    const l = await getListingById(Number(listingId));
    if (!l || l.status !== "active" || !l.phone) return { ok: false, error: (await getI18n()).t.errors.not_found };
    await trackEvent(l.id, "phone_reveal");
    return { ok: true, data: { phone: l.phone } };
  } catch (e) {
    return toActionError(e);
  }
}

/** Counts a click on "Call" / "Telegram". Silently ignored when abused. */
export async function trackContactAction(listingId: number, kind: "call" | "telegram") {
  if (kind !== "call" && kind !== "telegram") return;
  const ip = await clientIpHash();
  if (!(await hit(`contact:${ip}:${listingId}:${kind}`, 3, 3600))) return;
  const l = await getListingById(Number(listingId));
  if (l?.status === "active") await trackEvent(l.id, kind);
}

export async function reportAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  try {
    const user = await requireUser();
    await enforce(`report:${user.id}`, 20, 86_400);
    await createReport(user.id, {
      targetType: form.get("targetType") === "user" ? "user" : "listing",
      listingId: form.get("listingId") ? Number(form.get("listingId")) : undefined,
      targetUserId: form.get("targetUserId") ? String(form.get("targetUserId")) : undefined,
      reason: String(form.get("reason") ?? "") as "other",
      details: String(form.get("details") ?? ""),
    });
    return { ok: true, message: t.report.sent };
  } catch (e) {
    return toActionError(e);
  }
}

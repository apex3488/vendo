"use server";

import { revalidatePath } from "next/cache";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { toActionError } from "@/server/action-utils";
import { requireUser } from "@/server/auth/current";
import type { ActionResult } from "@/server/errors";
import { getAttributesForCategory } from "@/server/services/categories";
import { removeListingImage, reorderListingImages } from "@/server/services/images";
import { ownerSetStatus, saveListing, type ListingInput, type ListingStatus, type OwnerAction } from "@/server/services/listings";
import { enforce } from "@/server/services/rate-limit";

export type AttributeDTO = {
  id: number;
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean" | "date";
  required: boolean;
  unit: string | null;
  min: number | null;
  max: number | null;
  maxLength: number | null;
  options: { value: string; label: string }[];
};

export async function getAttributesAction(categoryId: number): Promise<AttributeDTO[]> {
  const { locale } = await getI18n();
  const attrs = await getAttributesForCategory(Number(categoryId));
  return attrs.map((a) => ({
    id: a.id,
    key: a.key,
    label: tr(a.label, locale),
    type: a.type,
    required: a.isRequired,
    unit: a.unit,
    min: a.minValue,
    max: a.maxValue,
    maxLength: a.maxLength,
    options: a.options.map((o) => ({ value: o.value, label: tr(o.label, locale) })),
  }));
}

export async function saveListingAction(
  id: number | null,
  data: ListingInput,
  submit: boolean,
): Promise<ActionResult<{ id: number; status: ListingStatus }>> {
  try {
    const user = await requireUser();
    await enforce(`listing-save:${user.id}`, 240, 3600);
    const res = await saveListing(user.id, id ? Number(id) : null, data, { submit });
    if (submit) revalidatePath("/account/listings");
    return { ok: true, data: res };
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeImageAction(listingId: number, imageId: number): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeListingImage(user.id, Number(listingId), Number(imageId));
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function reorderImagesAction(listingId: number, ids: number[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await reorderListingImages(user.id, Number(listingId), ids.map(Number).filter(Number.isInteger).slice(0, 50));
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function ownerStatusAction(listingId: number, action: OwnerAction): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!["archive", "mark_sold", "republish", "delete"].includes(action)) throw new Error("bad action");
    await ownerSetStatus(user.id, Number(listingId), action);
    revalidatePath("/account/listings");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

import sharp, { type Metadata } from "sharp";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { listingImages } from "../db/schema";
import { ServiceError } from "../errors";
import { getStorage, newKey } from "../storage";
import { getOwnedListing } from "./listings";
import { getSettings } from "./settings";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);
const MAX_PIXELS = 50_000_000;

/**
 * Validates an uploaded image by decoding it (the declared MIME type is not trusted),
 * then re-encodes it to WebP: this strips EXIF/GPS metadata and any embedded payloads.
 */
export async function processImage(input: Buffer, maxBytes: number) {
  if (input.length === 0) throw new ServiceError("image_invalid");
  if (input.length > maxBytes) throw new ServiceError("image_too_large");
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new ServiceError("image_invalid");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format) || !meta.width || !meta.height) throw new ServiceError("image_invalid");
  const base = sharp(input, { limitInputPixels: MAX_PIXELS }).rotate(); // honor EXIF orientation, then drop metadata
  const full = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 600, height: 600, fit: "cover", position: "attention" }).webp({ quality: 76 }).toBuffer();
  return { full: full.data, width: full.info.width, height: full.info.height, thumb };
}

export async function addListingImage(userId: string, listingId: number, file: Buffer) {
  const listing = await getOwnedListing(listingId, userId);
  if (listing.status === "blocked") throw new ServiceError("forbidden");
  const settings = await getSettings();
  const db = await getDb();
  const [c] = await db.select({ n: count() }).from(listingImages).where(eq(listingImages.listingId, listingId));
  if ((c?.n ?? 0) >= settings.maxImagesPerListing) throw new ServiceError("too_many_images");
  const img = await processImage(file, settings.maxImageMb * 1024 * 1024);
  const storage = getStorage();
  const key = newKey("listings");
  const thumbKey = key.replace(/\.webp$/, "-t.webp");
  await storage.put(key, img.full, "image/webp");
  await storage.put(thumbKey, img.thumb, "image/webp");
  const [row] = await db
    .insert(listingImages)
    .values({ listingId, storageKey: key, thumbKey, width: img.width, height: img.height, sort: c?.n ?? 0 })
    .returning();
  return row!;
}

export async function removeListingImage(userId: string, listingId: number, imageId: number) {
  await getOwnedListing(listingId, userId);
  const db = await getDb();
  const [img] = await db
    .delete(listingImages)
    .where(and(eq(listingImages.id, imageId), eq(listingImages.listingId, listingId)))
    .returning();
  if (!img) throw new ServiceError("not_found");
  await getStorage().remove([img.storageKey, img.thumbKey]);
}

/** Sets the order; the first id becomes the main photo. Ids not belonging to the listing are ignored. */
export async function reorderListingImages(userId: string, listingId: number, orderedIds: number[]) {
  await getOwnedListing(listingId, userId);
  const db = await getDb();
  const existing = await db
    .select({ id: listingImages.id })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.sort));
  const known = new Set(existing.map((e) => e.id));
  const order = [...orderedIds.filter((id) => known.has(id)), ...existing.map((e) => e.id).filter((id) => !orderedIds.includes(id))];
  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx.update(listingImages).set({ sort: i }).where(and(eq(listingImages.id, order[i]!), eq(listingImages.listingId, listingId)));
    }
  });
}

export async function deleteImagesFor(listingIds: number[]) {
  if (!listingIds.length) return;
  const db = await getDb();
  const imgs = await db.select().from(listingImages).where(inArray(listingImages.listingId, listingIds));
  await getStorage().remove(imgs.flatMap((i) => [i.storageKey, i.thumbKey]));
}

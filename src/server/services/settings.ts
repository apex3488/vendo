import { getDb } from "../db";
import { appSettings } from "../db/schema";

/** All admin-editable platform settings with their defaults. */
export const SETTINGS_DEFAULTS = {
  /** New and edited listings wait for a moderator before going public. */
  premoderation: true,
  /** Active listings allowed for users without a store subscription. */
  freeActiveListings: 20,
  /** Listings a single user may submit per 24 hours. */
  listingsPerDay: 10,
  maxImagesPerListing: 10,
  maxImageMb: 8,
  /** Days until an active listing expires to the archive. */
  listingTtlDays: 60,
  supportEmail: "",
  supportTelegram: "",
  /** Payment methods enabled once a provider is integrated. Empty = no online payment. */
  paymentMethods: [] as string[],
  /** How staff confirm paid requests while no provider is connected. */
  manualPaymentInstructions: "",
};

export type Settings = typeof SETTINGS_DEFAULTS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select().from(appSettings);
  const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS };
  for (const r of rows) if (r.key in SETTINGS_DEFAULTS) out[r.key] = r.value;
  return out as Settings;
}

export async function updateSettings(patch: Partial<Settings>, actorId: string) {
  const db = await getDb();
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in SETTINGS_DEFAULTS) || value === undefined) continue;
    await db
      .insert(appSettings)
      .values({ key, value, updatedBy: actorId })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
  }
}

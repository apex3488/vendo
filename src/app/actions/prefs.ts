"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { CITY_COOKIE } from "@/lib/site";
import { getCurrentUser } from "@/server/auth/current";
import { getDb } from "@/server/db";
import { cities, users } from "@/server/db/schema";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) {
    const db = await getDb();
    await db.update(users).set({ locale }).where(eq(users.id, user.id));
  }
}

export async function setCityAction(cityId: number | null) {
  const store = await cookies();
  if (!cityId) {
    store.delete(CITY_COOKIE);
    return;
  }
  const db = await getDb();
  const [c] = await db.select({ id: cities.id }).from(cities).where(eq(cities.id, cityId));
  if (!c) return;
  store.set(CITY_COOKIE, String(c.id), { path: "/", maxAge: YEAR, sameSite: "lax" });
}

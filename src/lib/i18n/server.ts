import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import en from "./dict/en";
import ru, { type Dict } from "./dict/ru";
import uz from "./dict/uz";

const DICTS: Record<Locale, Dict> = { ru, uz, en };

/** Locale from cookie, then Accept-Language, then default (ru). */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  if (accept.startsWith("uz")) return "uz";
  if (accept.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
});

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}

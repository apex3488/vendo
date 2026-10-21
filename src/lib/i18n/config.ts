import type { I18nText } from "@/server/db/schema";

export const LOCALES = ["ru", "uz", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "vendo_locale";

export const LOCALE_LABELS: Record<Locale, string> = { ru: "Русский", uz: "Oʻzbekcha", en: "English" };
export const LOCALE_SHORT: Record<Locale, string> = { ru: "RU", uz: "UZ", en: "EN" };
export const HTML_LANG: Record<Locale, string> = { ru: "ru", uz: "uz-Latn", en: "en" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Picks a translation with sensible fallbacks (requested -> ru -> any). */
export function tr(text: I18nText | null | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.ru || text.uz || text.en || "";
}

/** Replaces {name} placeholders. */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

import type { Locale } from "./i18n/config";

const INTL_LOCALE: Record<Locale, string> = { ru: "ru-RU", uz: "uz-Latn-UZ", en: "en-US" };

export const CURRENCIES = ["UZS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

const CURRENCY_LABEL: Record<Locale, Record<string, string>> = {
  ru: { UZS: "сум", USD: "$" },
  uz: { UZS: "soʻm", USD: "$" },
  en: { UZS: "UZS", USD: "$" },
};

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 2 }).format(n);
}

export function formatMoney(amount: number, currency: string, locale: Locale) {
  const label = CURRENCY_LABEL[locale][currency] ?? currency;
  const num = formatNumber(amount, locale);
  return currency === "USD" ? `${label}${num}` : `${num} ${label}`;
}

export function formatDate(d: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(d),
  );
}

export function formatDateTime(d: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

/** "5 минут назад" style relative time. */
export function formatRelative(d: Date | string, locale: Locale, now = Date.now()) {
  const diff = (new Date(d).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(d, locale);
}

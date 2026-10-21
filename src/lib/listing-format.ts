import type { Dict } from "./i18n/dict/ru";
import type { Locale } from "./i18n/config";
import { formatMoney } from "./format";

type PriceLike = {
  type: string;
  price: number | null;
  priceMax: number | null;
  currency: string;
  pricePeriod: string | null;
  isNegotiable: boolean;
};

export function formatListingPrice(l: PriceLike, t: Dict, locale: Locale): string {
  if (l.price == null) return l.isNegotiable ? t.listing.priceNegotiable : t.listing.priceOnRequest;
  const main = formatMoney(l.price, l.currency, locale);
  if (l.type === "service" && l.priceMax != null && l.priceMax > l.price) {
    return `${main} – ${formatMoney(l.priceMax, l.currency, locale)}`;
  }
  const period =
    l.pricePeriod === "hour"
      ? t.listing.perHour
      : l.pricePeriod === "day"
        ? t.listing.perDay
        : l.pricePeriod === "week"
          ? t.listing.perWeek
          : l.pricePeriod === "month"
            ? t.listing.perMonth
            : "";
  return period ? `${main} ${period}` : main;
}

export function conditionLabel(c: string | null, t: Dict) {
  switch (c) {
    case "new":
      return t.listing.conditionNew;
    case "like_new":
      return t.listing.conditionLikeNew;
    case "used":
      return t.listing.conditionUsed;
    case "for_parts":
      return t.listing.conditionForParts;
    default:
      return null;
  }
}

export function typeLabel(type: string, t: Dict) {
  return type === "rent" ? t.listing.rent : type === "service" ? t.listing.service : t.listing.sale;
}

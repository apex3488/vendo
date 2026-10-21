import type { SearchParams, Sort } from "@/server/services/search";

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const posInt = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};
const num = (v: string | undefined) => {
  if (v == null || v === "") return undefined;
  const n = Number(v.replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** URL query -> validated search parameters. Unknown/invalid values are ignored. */
export function parseSearchParams(raw: Raw): SearchParams {
  const sortRaw = first(raw.sort);
  const sort = (["relevance", "new", "price_asc", "price_desc", "popular"] as Sort[]).includes(sortRaw as Sort) ? (sortRaw as Sort) : undefined;
  const typeRaw = first(raw.type);
  const attrs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    // Number ranges come as a_<key>_min / a_<key>_max and are merged into "min..max".
    const range = /^a_([a-z][a-z0-9_]{0,59})_(min|max)$/.exec(k);
    if (range) {
      const key = range[1]!;
      const val = num(first(v));
      if (val == null) continue;
      const [lo = "", hi = ""] = (attrs[key]?.[0] ?? "..").split("..");
      attrs[key] = [range[2] === "min" ? `${val}..${hi}` : `${lo}..${val}`];
      continue;
    }
    if (k.startsWith("a_") && /^a_[a-z][a-z0-9_]{0,59}$/.test(k)) {
      const vals = all(v).filter((x) => x && x.length <= 80).slice(0, 20);
      if (vals.length) attrs[k.slice(2)] = vals;
    }
  }
  const cur = first(raw.cur);
  const days = posInt(first(raw.days));
  return {
    q: first(raw.q)?.slice(0, 100) || undefined,
    cityId: posInt(first(raw.city)),
    regionId: posInt(first(raw.region)),
    type: typeRaw === "sale" || typeRaw === "rent" || typeRaw === "service" ? typeRaw : undefined,
    condition: all(raw.cond).slice(0, 4),
    minPrice: num(first(raw.min)),
    maxPrice: num(first(raw.max)),
    currency: cur === "USD" ? "USD" : cur === "UZS" ? "UZS" : undefined,
    postedWithinDays: days && [1, 7, 30].includes(days) ? days : undefined,
    attrs: Object.keys(attrs).length ? attrs : undefined,
    sort,
    page: posInt(first(raw.page)) ?? 1,
  };
}

/** Rebuilds a query string from raw params with overrides (null removes a key). */
export function withParams(raw: Raw, overrides: Record<string, string | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (k in overrides) continue;
    for (const x of all(v)) sp.append(k, x);
  }
  for (const [k, v] of Object.entries(overrides)) if (v != null && v !== "") sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(p: SearchParams) {
  return !!(
    p.cityId ||
    p.regionId ||
    p.type ||
    p.condition?.length ||
    p.minPrice != null ||
    p.maxPrice != null ||
    p.postedWithinDays ||
    (p.attrs && Object.keys(p.attrs).length)
  );
}

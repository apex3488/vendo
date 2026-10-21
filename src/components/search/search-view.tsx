import Link from "next/link";
import { ChevronRight, SearchX, SlidersHorizontal } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { ListingCard, ListingGrid } from "@/components/listing/listing-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/format";
import { hasActiveFilters, parseSearchParams, withParams } from "@/lib/search-params";
import { getCurrentUser } from "@/server/auth/current";
import type { Attribute, Category } from "@/server/services/categories";
import { getCategoryTree } from "@/server/services/categories";
import { getRegionsWithCities } from "@/server/services/locations";
import { recordSearchQuery, searchListings } from "@/server/services/search";
import { after } from "next/server";
import { SortSelect } from "./sort-select";

type Raw = Record<string, string | string[] | undefined>;

export async function SearchView({
  raw,
  basePath,
  category,
  ancestors = [],
  subcategories = [],
  filterAttrs = [],
}: {
  raw: Raw;
  basePath: string;
  category?: Category;
  ancestors?: Category[];
  subcategories?: Category[];
  filterAttrs?: Attribute[];
}) {
  const [{ locale, t }, user, regions] = await Promise.all([getI18n(), getCurrentUser(), getRegionsWithCities()]);
  const p = parseSearchParams(raw);
  const result = await searchListings({ ...p, categoryId: category?.id, perPage: 24 }, user?.id);
  const featured =
    category && p.page === 1
      ? await searchListings({ categoryId: category.id, featuredOnly: true, perPage: 4, sort: "new" }, user?.id)
      : null;
  if (p.q && p.page === 1) after(() => recordSearchQuery(p.q!));

  const title = category ? tr(category.name, locale) : p.q ? fmt(t.search.resultsFor, { q: p.q }) : t.search.results;
  const sort = p.sort ?? (p.q ? "relevance" : "new");
  const showCondition = !category || (category.hasCondition && category.allowedTypes.includes("sale"));
  const allowedTypes = category?.allowedTypes ?? ["sale", "rent", "service"];
  const filtersActive = hasActiveFilters(p);
  const rawStr = (k: string) => {
    const v = raw[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const rawAll = (k: string) => {
    const v = raw[k];
    return v == null ? [] : Array.isArray(v) ? v : [v];
  };
  const roots = !category ? await getCategoryTree() : [];

  const filters = (
    <form method="get" action={basePath} className="space-y-6">
      {p.q && <input type="hidden" name="q" value={p.q} />}
      {raw.sort && <input type="hidden" name="sort" value={rawStr("sort")} />}

      {allowedTypes.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">{t.search.listingType}</legend>
          <div className="flex flex-wrap gap-1.5">
            {[["", t.search.anyType], ...allowedTypes.map((ty) => [ty, ty === "sale" ? t.listing.sale : ty === "rent" ? t.listing.rent : t.listing.service])].map(
              ([v, l]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="type" value={v} defaultChecked={(p.type ?? "") === v} className="peer sr-only" />
                  <span className="inline-block rounded-full border border-line-strong px-3 py-1.5 text-sm font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                    {l}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="f-city" className="mb-2 block text-sm font-bold">
          {t.nav.city}
        </label>
        <select id="f-city" name="city" defaultValue={p.cityId ?? ""} className="h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink">
          <option value="">{t.nav.allCities}</option>
          {regions.map((r) => (
            <optgroup key={r.id} label={tr(r.name, locale)}>
              {r.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {tr(c.name, locale)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t.search.price}</legend>
        <div className="flex gap-2">
          <input name="min" inputMode="numeric" defaultValue={rawStr("min")} placeholder={t.search.priceFrom} aria-label={`${t.search.price} ${t.search.priceFrom}`} className="h-10 w-full min-w-0 rounded-[10px] border border-line-strong px-3 text-sm outline-none focus:border-ink" />
          <input name="max" inputMode="numeric" defaultValue={rawStr("max")} placeholder={t.search.priceTo} aria-label={`${t.search.price} ${t.search.priceTo}`} className="h-10 w-full min-w-0 rounded-[10px] border border-line-strong px-3 text-sm outline-none focus:border-ink" />
          <select name="cur" defaultValue={p.currency ?? "UZS"} aria-label={t.search.currency} className="h-10 rounded-[10px] border border-line-strong bg-surface px-2 text-sm outline-none focus:border-ink">
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </fieldset>

      {showCondition && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">{t.search.condition}</legend>
          <div className="space-y-2">
            {(
              [
                ["new", t.listing.conditionNew],
                ["like_new", t.listing.conditionLikeNew],
                ["used", t.listing.conditionUsed],
                ["for_parts", t.listing.conditionForParts],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" name="cond" value={v} defaultChecked={p.condition?.includes(v)} className="h-4 w-4 accent-ink" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {filterAttrs.map((a) => (
        <fieldset key={a.id}>
          <legend className="mb-2 text-sm font-bold">
            {tr(a.label, locale)}
            {a.unit ? `, ${a.unit}` : ""}
          </legend>
          {(a.type === "select" || a.type === "multiselect") && (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {a.options.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" name={`a_${a.key}`} value={o.value} defaultChecked={rawAll(`a_${a.key}`).includes(o.value)} className="h-4 w-4 accent-ink" />
                  {tr(o.label, locale)}
                </label>
              ))}
            </div>
          )}
          {a.type === "number" && (
            <NumberRange name={`a_${a.key}`} min={rawStr(`a_${a.key}_min`)} max={rawStr(`a_${a.key}_max`)} from={t.search.priceFrom} to={t.search.priceTo} />
          )}
          {a.type === "boolean" && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" name={`a_${a.key}`} value="1" defaultChecked={rawStr(`a_${a.key}`) === "1"} className="h-4 w-4 accent-ink" />
              {t.search.yes}
            </label>
          )}
        </fieldset>
      ))}

      <div>
        <label htmlFor="f-days" className="mb-2 block text-sm font-bold">
          {t.search.posted}
        </label>
        <select id="f-days" name="days" defaultValue={p.postedWithinDays ?? ""} className="h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink">
          <option value="">{t.search.postedAny}</option>
          <option value="1">{t.search.posted1}</option>
          <option value="7">{t.search.posted7}</option>
          <option value="30">{t.search.posted30}</option>
        </select>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button type="submit" className={buttonClass("primary", "md", "w-full")}>
          {t.search.applyFilters}
        </button>
        {filtersActive && (
          <Link href={`${basePath}${p.q ? `?q=${encodeURIComponent(p.q)}` : ""}`} className={buttonClass("ghost", "md", "w-full")}>
            {t.search.resetFilters}
          </Link>
        )}
      </div>
    </form>
  );

  return (
    <div className="container-x pt-6 md:pt-8">
      {category && (
        <nav aria-label="breadcrumbs" className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/" className="hover:text-ink">
            {t.nav.home}
          </Link>
          {ancestors.map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href={`/c/${a.slug}${withParams(raw, { page: null })}`} className="hover:text-ink">
                {tr(a.name, locale)}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-1">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{fmt(t.search.found, { n: formatNumber(result.total, locale) })}</p>
        </div>
        <SortSelect value={sort} hasQuery={!!p.q} />
      </div>

      {subcategories.length > 0 && (
        <div className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {subcategories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}${withParams(raw, { page: null })}`} className="shrink-0 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold hover:border-ink">
              {tr(c.name, locale)}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="group rounded-[var(--radius-lg)] border border-line bg-surface lg:hidden" open={false}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t.search.filters}
                {filtersActive && <span className="h-2 w-2 rounded-full bg-lime-strong" />}
              </span>
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-line p-4">{filters}</div>
          </details>
          <div className="hidden rounded-[var(--radius-lg)] border border-line bg-surface p-5 lg:block">{filters}</div>
        </aside>

        <div className="min-w-0">
          <AdSlot placement="search_banner" categoryId={category?.id} label={t.common.ad} className="mb-5" />

          {featured && featured.items.length > 0 && (
            <section className="mb-6 rounded-[var(--radius-lg)] bg-lime-soft p-3 md:p-4">
              <p className="mb-3 text-sm font-bold text-lime-ink">{t.search.featured}</p>
              <ListingGrid className="lg:grid-cols-4 xl:grid-cols-4">
                {featured.items.map((item) => (
                  <ListingCard key={item.id} item={item} t={t} locale={locale} loggedIn={!!user} />
                ))}
              </ListingGrid>
            </section>
          )}

          {result.items.length ? (
            <ListingGrid className="lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((item, i) => (
                <ListingCard key={item.id} item={item} t={t} locale={locale} loggedIn={!!user} priority={i < 4} />
              ))}
            </ListingGrid>
          ) : (
            <EmptyState
              icon={<SearchX className="h-6 w-6" />}
              title={t.search.nothing}
              text={t.search.nothingHint}
              action={
                <div className="flex flex-col items-center gap-4">
                  {filtersActive && (
                    <Link href={`${basePath}${p.q ? `?q=${encodeURIComponent(p.q)}` : ""}`} className={buttonClass("primary")}>
                      {t.search.resetFilters}
                    </Link>
                  )}
                  {roots.length > 0 && (
                    <div className="flex max-w-xl flex-wrap justify-center gap-2">
                      {roots.slice(0, 8).map((c) => (
                        <Link key={c.id} href={`/c/${c.slug}`} className="rounded-full bg-soft px-3 py-1.5 text-sm font-medium hover:bg-line">
                          {tr(c.name, locale)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              }
            />
          )}

          {result.pages > 1 && (
            <nav aria-label="pagination" className="mt-8 flex items-center justify-center gap-2">
              {result.page > 1 && (
                <Link rel="prev" href={`${basePath}${withParams(raw, { page: result.page > 2 ? String(result.page - 1) : null })}`} className={buttonClass("secondary", "sm")}>
                  {t.search.prev}
                </Link>
              )}
              {pageNumbers(result.page, result.pages).map((n, i) =>
                n === 0 ? (
                  <span key={`gap${i}`} className="px-1 text-muted">
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={`${basePath}${withParams(raw, { page: n > 1 ? String(n) : null })}`}
                    aria-current={n === result.page ? "page" : undefined}
                    className={buttonClass(n === result.page ? "primary" : "ghost", "sm", "min-w-9")}
                  >
                    {n}
                  </Link>
                ),
              )}
              {result.page < result.pages && (
                <Link rel="next" href={`${basePath}${withParams(raw, { page: String(result.page + 1) })}`} className={buttonClass("secondary", "sm")}>
                  {t.search.next}
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/** Two plain inputs (works without JS); parseSearchParams merges them into "min..max". */
function NumberRange({ name, min, max, from, to }: { name: string; min: string; max: string; from: string; to: string }) {
  return (
    <div className="flex gap-2">
      <input name={`${name}_min`} inputMode="numeric" defaultValue={min} placeholder={from} className="h-10 w-full min-w-0 rounded-[10px] border border-line-strong px-3 text-sm outline-none focus:border-ink" />
      <input name={`${name}_max`} inputMode="numeric" defaultValue={max} placeholder={to} className="h-10 w-full min-w-0 rounded-[10px] border border-line-strong px-3 text-sm outline-none focus:border-ink" />
    </div>
  );
}

function pageNumbers(current: number, total: number): number[] {
  const set = new Set([1, total, current, current - 1, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push(0);
    out.push(sorted[i]!);
  }
  return out;
}

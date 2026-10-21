import Link from "next/link";
import { after } from "next/server";
import { ArrowRight, BarChart3, Check, MessageCircle, Store } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { CategoryIcon } from "@/components/category-icon";
import { getSelectedCityId } from "@/components/layout/header";
import { SearchBox } from "@/components/layout/search-box";
import { ListingSection } from "@/components/listing/listing-rail";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { getCategoryTree } from "@/server/services/categories";
import { getHomeCollections } from "@/server/services/content";
import { getCities } from "@/server/services/locations";
import { maybeRunMaintenance } from "@/server/services/maintenance";
import { popularQueries, searchListings } from "@/server/services/search";

export default async function HomePage() {
  const [{ locale, t }, user, tree, cityId, popular, collections, cities] = await Promise.all([
    getI18n(),
    getCurrentUser(),
    getCategoryTree(),
    getSelectedCityId(),
    popularQueries(),
    getHomeCollections(),
    getCities(),
  ]);
  after(maybeRunMaintenance);

  const viewer = user?.id ?? null;
  const city = cities.find((c) => c.id === cityId);
  const [featured, recent, popularItems, nearby, ...collectionItems] = await Promise.all([
    searchListings({ featuredOnly: true, sort: "new", perPage: 10 }, viewer),
    searchListings({ sort: "new", perPage: 10 }, viewer),
    searchListings({ sort: "popular", perPage: 10 }, viewer),
    city ? searchListings({ cityId: city.id, sort: "new", perPage: 10 }, viewer) : Promise.resolve(null),
    ...collections.map((c) =>
      searchListings(
        { categorySlug: c.filter.categorySlug, type: c.filter.type, sort: c.filter.sort, maxPrice: c.filter.maxPrice, q: c.filter.q, perPage: 10 },
        viewer,
      ),
    ),
  ]);
  const loggedIn = !!user;
  const categoriesForSearch = tree.map((c) => ({ slug: c.slug, name: tr(c.name, locale) }));
  const hasAnyListings = recent.total > 0;

  return (
    <>
      {/* Hero search */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-7 md:py-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-lime-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-ink" />
            {t.meta.tagline}
          </p>
          <h1 className="t-display max-w-3xl">{t.home.heroTitle}</h1>
          <p className="mt-4 max-w-2xl text-base text-muted md:text-lg">{t.home.heroSubtitle}</p>
          <div className="mt-7 max-w-4xl md:mt-9">
            <SearchBox popular={popular} categories={categoriesForSearch} cityId={city?.id ?? null} withCategory />
          </div>
          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{t.search.popular}:</span>
              {popular.slice(0, 6).map((q) => (
                <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="rounded-full bg-soft px-3 py-1 font-medium text-ink-2 hover:bg-line">
                  {q}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="container-x mt-10 md:mt-12" aria-labelledby="cats">
        <h2 id="cats" className="t-2 mb-5">
          {t.home.categories}
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-6 xl:grid-cols-7">
          {tree.map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${c.slug}`}
                className="group flex h-full items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-2.5 transition-colors hover:border-ink/30 active:bg-soft md:flex-col md:items-start md:justify-between md:gap-5 md:p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-soft text-ink transition-colors group-hover:bg-lime md:h-11 md:w-11">
                  <CategoryIcon name={c.icon} className="h-[22px] w-[22px]" />
                </span>
                <span className="line-clamp-2 min-w-0 break-words text-[13px] font-semibold leading-tight md:text-[14.5px]">{tr(c.name, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="container-x mt-8">
        <AdSlot placement="home_banner" label={t.common.ad} />
      </div>

      <ListingSection title={t.home.recommended} subtitle={t.home.recommendedNote} items={featured.items} t={t} locale={locale} loggedIn={loggedIn} />

      {hasAnyListings ? (
        <ListingSection title={t.home.recent} href="/search?sort=new" items={recent.items} t={t} locale={locale} loggedIn={loggedIn} />
      ) : (
        <section className="container-x mt-12">
          <EmptyState
            title={t.home.emptyTitle}
            text={t.home.emptyText}
            action={
              <LinkButton href="/post" variant="accent">
                {t.nav.post}
              </LinkButton>
            }
          />
        </section>
      )}

      {nearby && city && (
        <ListingSection
          title={fmt(t.home.nearby, { city: tr(city.name, locale) })}
          href={`/search?city=${city.id}`}
          items={nearby.items}
          t={t}
          locale={locale}
          loggedIn={loggedIn}
        />
      )}

      <ListingSection title={t.home.popular} href="/search?sort=popular" items={popularItems.items.filter((i) => !recent.items.slice(0, 5).some((r) => r.id === i.id))} t={t} locale={locale} loggedIn={loggedIn} />

      {collections.map((c, i) => {
        const res = collectionItems[i]!;
        const sp = new URLSearchParams();
        if (c.filter.type) sp.set("type", c.filter.type);
        if (c.filter.sort) sp.set("sort", c.filter.sort);
        if (c.filter.q) sp.set("q", c.filter.q);
        if (c.filter.maxPrice) sp.set("max", String(c.filter.maxPrice));
        const href = `${c.filter.categorySlug ? `/c/${c.filter.categorySlug}` : "/search"}${sp.size ? `?${sp}` : ""}`;
        return <ListingSection key={c.id} title={tr(c.title, locale)} href={href} items={res.items} t={t} locale={locale} loggedIn={loggedIn} />;
      })}

      {/* For sellers & stores */}
      <section className="container-x mt-16 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-[var(--radius-xl)] bg-ink p-7 text-white md:p-10">
          <h2 className="t-1 text-white">{t.home.sellersTitle}</h2>
          <p className="mt-3 max-w-md text-white/70">{t.home.sellersText}</p>
          <ul className="mt-6 space-y-3">
            {[
              { icon: Check, text: t.home.sellersPoint1 },
              { icon: MessageCircle, text: t.home.sellersPoint2 },
              { icon: BarChart3, text: t.home.sellersPoint3 },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-ink">
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <LinkButton href="/post" variant="accent" size="lg">
              {t.nav.post}
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </div>
        <div className="flex flex-col rounded-[var(--radius-xl)] border border-line bg-surface p-7 md:p-10">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-lime-soft text-lime-ink">
            <Store className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h2 className="t-1 mt-5">{t.home.storesTitle}</h2>
          <p className="mt-3 max-w-md text-muted">{t.home.storesText}</p>
          <div className="mt-auto flex flex-wrap gap-3 pt-8">
            <LinkButton href="/account/store" variant="primary" size="lg">
              {t.home.storesCta}
            </LinkButton>
            <LinkButton href="/plans" variant="secondary" size="lg">
              {t.home.plansCta}
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

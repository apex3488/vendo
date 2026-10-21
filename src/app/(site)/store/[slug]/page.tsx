import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Store } from "lucide-react";
import { ContactButtons } from "@/components/listing/contact-buttons";
import { ListingCard, ListingGrid } from "@/components/listing/listing-card";
import { ReportButton } from "@/components/listing/share-report";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/current";
import { getDb } from "@/server/db";
import { cities } from "@/server/db/schema";
import { searchListings } from "@/server/services/search";
import { getStoreBySlug } from "@/server/services/stores";
import { mediaUrl } from "@/server/storage";
import { eq } from "drizzle-orm";
import Link from "next/link";

export async function generateMetadata({ params }: PageProps<"/store/[slug]">): Promise<Metadata> {
  const store = await getStoreBySlug((await params).slug);
  if (!store) return { robots: { index: false } };
  return {
    title: store.name,
    description: store.description?.slice(0, 160) ?? store.name,
    alternates: { canonical: `/store/${store.slug}` },
    openGraph: { title: store.name, images: store.logoKey ? [mediaUrl(store.logoKey)!] : undefined },
  };
}

export default async function StorePage({ params, searchParams }: PageProps<"/store/[slug]">) {
  const store = await getStoreBySlug((await params).slug);
  if (!store) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ locale, t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const db = await getDb();
  const [city] = store.cityId ? await db.select().from(cities).where(eq(cities.id, store.cityId)) : [];
  const result = await searchListings({ storeId: store.id, sort: "new", page, perPage: 24 }, user?.id);
  const logo = mediaUrl(store.logoKey);

  return (
    <div className="container-x pt-6 md:pt-10">
      <section className="rounded-[var(--radius-xl)] border border-line bg-surface p-5 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={store.name} className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-line md:h-24 md:w-24" />
          ) : (
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ink text-lime md:h-24 md:w-24">
              <Store className="h-9 w-9" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="t-1 flex flex-wrap items-center gap-2">
              {store.name}
              {store.verifiedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                  <BadgeCheck className="h-4 w-4" />
                  {t.store.verified}
                </span>
              )}
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {tr(city.name, locale)}
                </span>
              )}
              <span>{fmt(t.store.since, { date: formatDate(store.createdAt, locale) })}</span>
              <span>{fmt(t.store.active, { n: store.activeCount })}</span>
            </p>
            {store.description && <p className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{store.description}</p>}
          </div>
          <div className="w-full shrink-0 md:w-72">
            <ContactButtons listingId={0} hasPhone={!!store.phone} phoneMasked={null} phonePublic={store.phone} telegram={store.telegram} />
            <div className="mt-3">
              <ReportButton targetUserId={store.ownerId} loggedIn={!!user} />
            </div>
          </div>
        </div>
      </section>

      <h2 className="t-2 mb-5 mt-10">{t.store.catalog}</h2>
      {result.items.length ? (
        <ListingGrid>
          {result.items.map((item) => (
            <ListingCard key={item.id} item={item} t={t} locale={locale} loggedIn={!!user} />
          ))}
        </ListingGrid>
      ) : (
        <EmptyState title={t.store.noListings} />
      )}
      {result.pages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="pagination">
          {page > 1 && (
            <Link className={buttonClass("secondary", "sm")} href={`?page=${page - 1}`}>
              {t.search.prev}
            </Link>
          )}
          {page < result.pages && (
            <Link className={buttonClass("secondary", "sm")} href={`?page=${page + 1}`}>
              {t.search.next}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";
import { AlertTriangle, BadgeCheck, ChevronRight, MapPin, ShieldCheck, Store as StoreIcon } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { ContactButtons } from "@/components/listing/contact-buttons";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { Gallery } from "@/components/listing/gallery";
import { ListingSection } from "@/components/listing/listing-rail";
import { ReportButton, ShareButton } from "@/components/listing/share-report";
import { LinkButton } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/misc";
import { maskPhone } from "@/lib/contacts";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { conditionLabel, formatListingPrice, typeLabel } from "@/lib/listing-format";
import { listingPath, parseListingParam } from "@/lib/slug";
import { siteUrl } from "@/lib/site";
import { clientIpHash } from "@/server/action-utils";
import { getCurrentUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db";
import { cities } from "@/server/db/schema";
import { getCategoryWithAncestors } from "@/server/services/categories";
import { isFavorite, trackEvent } from "@/server/services/engagement";
import { getListingAttributesView, getListingById, getListingImages, incrementViews } from "@/server/services/listings";
import { hit } from "@/server/services/rate-limit";
import { getSellerSummary, searchListings } from "@/server/services/search";
import { mediaUrl } from "@/server/storage";
import { eq } from "drizzle-orm";

async function load(param: string) {
  const id = parseListingParam(param);
  if (!id) return null;
  return getListingById(id);
}

export async function generateMetadata({ params }: PageProps<"/l/[slug]">): Promise<Metadata> {
  const l = await load((await params).slug);
  if (!l || l.status !== "active") return { robots: { index: false } };
  const { locale, t } = await getI18n();
  const imgs = await getListingImages(l.id);
  const price = formatListingPrice(l, t, locale);
  const description = `${price}. ${l.description.slice(0, 150)}`;
  return {
    title: l.title,
    description,
    alternates: { canonical: listingPath(l) },
    openGraph: {
      title: l.title,
      description,
      url: listingPath(l),
      type: "website",
      images: imgs[0] ? [{ url: mediaUrl(imgs[0].storageKey)!, width: imgs[0].width, height: imgs[0].height }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: PageProps<"/l/[slug]">) {
  const { slug } = await params;
  const listing = await load(slug);
  if (!listing) notFound();
  const [{ locale, t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const isOwner = user?.id === listing.userId;
  const isStaffViewer = can(user?.role, "listings.view_all");
  if (listing.status !== "active" && !isOwner && !isStaffViewer) notFound();
  if (slug !== `${listing.id}-${listing.slug}`) permanentRedirect(listingPath(listing));

  const db = await getDb();
  const [images, attrs, chain, seller, fav, cityRow] = await Promise.all([
    getListingImages(listing.id),
    getListingAttributesView(listing.id),
    getCategoryWithAncestors(listing.categoryId),
    getSellerSummary(listing.userId),
    user ? isFavorite(user.id, listing.id) : Promise.resolve(false),
    listing.cityId ? db.select().from(cities).where(eq(cities.id, listing.cityId)).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const category = chain[chain.length - 1];
  const [sellerOther, similar] = await Promise.all([
    searchListings({ userId: listing.userId, excludeId: listing.id, perPage: 5, sort: "new" }, user?.id),
    searchListings({ categoryId: listing.categoryId, excludeId: listing.id, perPage: 10, sort: "new", cityId: undefined }, user?.id),
  ]);

  if (listing.status === "active" && !isOwner) {
    const ip = await clientIpHash();
    after(async () => {
      // Count a view at most once per visitor per listing per 6 hours.
      if (await hit(`view:${ip}:${listing.id}`, 1, 6 * 3600)) {
        await incrementViews(listing.id);
        await trackEvent(listing.id, "view");
      }
    });
  }

  // Group multiselect values by attribute
  const attrRows: { label: string; value: string }[] = [];
  for (const a of attrs) {
    const label = tr(a.label, locale);
    let value: string;
    if (a.type === "select" || a.type === "multiselect") value = tr(a.optionLabel, locale);
    else if (a.type === "boolean") value = t.listing.yes;
    else if (a.type === "number") value = `${formatNumber(a.valueNumber ?? 0, locale)}${a.unit ? ` ${a.unit}` : ""}`;
    else if (a.type === "date") value = a.valueDate ? formatDate(a.valueDate, locale) : "";
    else value = a.valueText ?? "";
    const existing = attrRows.find((r) => r.label === label);
    if (existing && a.type === "multiselect") existing.value += `, ${value}`;
    else attrRows.push({ label, value });
  }
  const cond = conditionLabel(listing.condition, t);
  const price = formatListingPrice(listing, t, locale);
  const galleryImages = images.map((i) => ({ src: mediaUrl(i.storageKey)!, thumb: mediaUrl(i.thumbKey)!, width: i.width, height: i.height }));
  const highValue = chain.some((c) => c.highValue);

  const jsonLd =
    listing.status === "active"
      ? {
          "@context": "https://schema.org",
          "@type": listing.type === "service" ? "Service" : "Product",
          name: listing.title,
          description: listing.description.slice(0, 500),
          image: galleryImages.map((g) => (g.src.startsWith("http") ? g.src : `${siteUrl()}${g.src}`)),
          url: `${siteUrl()}${listingPath(listing)}`,
          ...(listing.price != null && listing.type !== "service"
            ? {
                offers: {
                  "@type": "Offer",
                  price: listing.price,
                  priceCurrency: listing.currency,
                  availability: "https://schema.org/InStock",
                  itemCondition: listing.condition === "new" ? "https://schema.org/NewCondition" : listing.condition ? "https://schema.org/UsedCondition" : undefined,
                },
              }
            : {}),
        }
      : null;

  const summary = (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={listing.type === "sale" ? "neutral" : "lime"}>{typeLabel(listing.type, t)}</Badge>
        {cond && <Badge>{cond}</Badge>}
        {listing.isNegotiable && listing.price != null && <Badge tone="info">{t.listing.negotiable}</Badge>}
      </div>
      <h1 className="mt-3 text-[22px] font-extrabold leading-tight tracking-[-0.02em] md:text-[26px]">{listing.title}</h1>
      <p className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">{price}</p>
      {cityRow && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-4 w-4" />
          {tr(cityRow.name, locale)}
        </p>
      )}
      <div className="mt-5">
        {listing.status === "active" ? (
          <ContactButtons
            listingId={listing.id}
            hasPhone={!!listing.phone}
            phoneMasked={listing.phone && listing.hidePhone ? maskPhone(listing.phone) : null}
            phonePublic={listing.phone && !listing.hidePhone ? listing.phone : null}
            telegram={listing.telegram}
          />
        ) : null}
      </div>
      <div className="mt-3 flex gap-2">
        <FavoriteButton listingId={listing.id} initial={fav} loggedIn={!!user} variant="full" />
        <ShareButton title={listing.title} />
        {isOwner && (
          <LinkButton href={`/post/${listing.id}`} variant="secondary" className="ml-auto">
            {t.listing.edit}
          </LinkButton>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-x pt-5 md:pt-8">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

      <nav aria-label="breadcrumbs" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          {t.nav.home}
        </Link>
        {chain.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/c/${c.slug}`} className="hover:text-ink">
              {tr(c.name, locale)}
            </Link>
          </span>
        ))}
      </nav>

      {listing.status !== "active" && (
        <Alert tone={listing.status === "rejected" || listing.status === "blocked" ? "danger" : "warn"} className="mb-5" title={fmt(t.listing.statusBanner, { status: t.status[listing.status] })}>
          {listing.rejectionReason ? fmt(t.listing.rejectedReason, { reason: listing.rejectionReason }) : null}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-10 lg:gap-y-2">
        <div className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1">
          <Gallery images={galleryImages} title={listing.title} />
        </div>

        <div className="order-3 min-w-0 lg:order-none lg:col-start-1 lg:row-start-2">

          {attrRows.length + (cond ? 1 : 0) > 0 && (
            <section className="mt-8">
              <h2 className="t-2 mb-4">{t.listing.characteristics}</h2>
              <dl className="grid gap-x-8 sm:grid-cols-2">
                {cond && (
                  <div className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
                    <dt className="text-muted">{t.listing.condition}</dt>
                    <dd className="text-right font-semibold">{cond}</dd>
                  </div>
                )}
                {listing.type === "rent" && listing.deposit != null && (
                  <div className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
                    <dt className="text-muted">{t.listing.deposit}</dt>
                    <dd className="text-right font-semibold">{formatListingPrice({ ...listing, price: listing.deposit, pricePeriod: null, type: "sale" }, t, locale)}</dd>
                  </div>
                )}
                {attrRows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
                    <dt className="text-muted">{r.label}</dt>
                    <dd className="text-right font-semibold">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="mt-8">
            <h2 className="t-2 mb-3">{t.listing.description}</h2>
            <div className="whitespace-pre-line break-words text-[15.5px] leading-relaxed text-ink-2">{listing.description}</div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              {listing.publishedAt && (
                <span>
                  {t.listing.published}: {formatDateTime(listing.publishedAt, locale)}
                </span>
              )}
              <span>{fmt(t.listing.views, { n: listing.viewsCount })}</span>
              <span>ID {listing.id}</span>
              <span className="ml-auto">
                <ReportButton listingId={listing.id} loggedIn={!!user} />
              </span>
            </div>
          </section>
        </div>

        {/* On phones the wrapper dissolves (display: contents) so its children can be ordered between the gallery and details. */}
        <div className="contents lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:space-y-4">
        <div className="order-2 lg:order-none">{summary}</div>
        <aside className="order-4 space-y-4 lg:order-none">
          {seller && (
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{seller.storeSlug && seller.storeStatus === "active" ? t.listing.store : t.listing.seller}</p>
              <div className="mt-3 flex items-center gap-3">
                {seller.storeLogo && seller.storeStatus === "active" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(seller.storeLogo)!} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-line" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-lime">
                    {(seller.storeName ?? seller.displayName).charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-bold">
                    {seller.storeSlug && seller.storeStatus === "active" ? (
                      <Link href={`/store/${seller.storeSlug}`} className="truncate hover:underline">
                        {seller.storeName}
                      </Link>
                    ) : (
                      <Link href={`/u/${seller.id}`} className="truncate hover:underline">
                        {seller.displayName}
                      </Link>
                    )}
                    {seller.storeVerifiedAt && seller.storeStatus === "active" && <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-label={t.listing.verifiedStore} />}
                  </p>
                  <p className="text-sm text-muted">{fmt(t.listing.onVendoSince, { date: formatDate(seller.createdAt, locale) })}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-2">{fmt(t.listing.activeListings, { n: seller.activeCount })}</p>
              {seller.storeSlug && seller.storeStatus === "active" && (
                <LinkButton href={`/store/${seller.storeSlug}`} variant="secondary" size="sm" className="mt-4 w-full">
                  <StoreIcon className="h-4 w-4" />
                  {t.store.openPage}
                </LinkButton>
              )}
              {!isOwner && (
                <div className="mt-3">
                  <ReportButton targetUserId={listing.userId} loggedIn={!!user} />
                </div>
              )}
            </div>
          )}

          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <p className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-5 w-5 text-success" />
              {t.listing.safetyTitle}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              <li>• {t.listing.safety1}</li>
              <li>• {t.listing.safety2}</li>
              <li>• {t.listing.safety3}</li>
            </ul>
            {highValue && (
              <p className="mt-3 flex gap-2 rounded-[10px] bg-warn-soft p-3 text-sm text-warn">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t.listing.safetyHighValue}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted">{t.listing.notGuarantee}</p>
            <Link href="/p/safety" className="mt-2 inline-block text-sm font-semibold underline-offset-4 hover:underline">
              {t.listing.safetyMore}
            </Link>
          </div>

          <AdSlot placement="listing_sidebar" categoryId={listing.categoryId} label={t.common.ad} />
        </aside>
        </div>
      </div>

      <ListingSection title={t.listing.sellerOther} items={sellerOther.items} t={t} locale={locale} loggedIn={!!user} limit={5} href={seller?.storeSlug ? `/store/${seller.storeSlug}` : `/u/${listing.userId}`} />
      <ListingSection title={t.listing.similar} items={similar.items} t={t} locale={locale} loggedIn={!!user} href={category ? `/c/${category.slug}` : undefined} />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ContactButtons } from "@/components/listing/contact-buttons";
import { ListingCard, ListingGrid } from "@/components/listing/listing-card";
import { ReportButton } from "@/components/listing/share-report";
import { EmptyState } from "@/components/ui/misc";
import { fmt } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/current";
import { getSellerSummary, searchListings } from "@/server/services/search";
import { getPublicUser } from "@/server/services/users";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/u/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const u = await getPublicUser(id);
  return u ? { title: u.displayName, robots: { index: false, follow: true } } : { robots: { index: false } };
}

export default async function SellerPage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const seller = await getPublicUser(id);
  if (!seller) notFound();
  const summary = await getSellerSummary(id);
  if (summary?.storeSlug && summary.storeStatus === "active") redirect(`/store/${summary.storeSlug}`);
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getCurrentUser()]);
  const listings = await searchListings({ userId: id, sort: "new", perPage: 48 }, viewer?.id);
  return (
    <div className="container-x pt-6 md:pt-10">
      <section className="flex flex-col gap-6 rounded-[var(--radius-xl)] border border-line bg-surface p-5 md:flex-row md:items-center md:p-8">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ink text-3xl font-bold text-lime">
          {seller.displayName.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="t-1">{seller.displayName}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {fmt(t.listing.onVendoSince, { date: formatDate(seller.createdAt, locale) })} · {fmt(t.listing.activeListings, { n: listings.total })}
          </p>
        </div>
        <div className="w-full md:w-72">
          {/* The phone appears only if the seller enabled "show phone in public profile". */}
          {(seller.phone || seller.telegram) && (
            <ContactButtons listingId={0} hasPhone={!!seller.phone} phoneMasked={null} phonePublic={seller.phone} telegram={seller.telegram} />
          )}
          {viewer?.id !== seller.id && (
            <div className="mt-3">
              <ReportButton targetUserId={seller.id} loggedIn={!!viewer} />
            </div>
          )}
        </div>
      </section>
      <div className="mt-8">
        {listings.items.length ? (
          <ListingGrid>
            {listings.items.map((item) => (
              <ListingCard key={item.id} item={item} t={t} locale={locale} loggedIn={!!viewer} />
            ))}
          </ListingGrid>
        ) : (
          <EmptyState title={t.account.empty} />
        )}
      </div>
    </div>
  );
}

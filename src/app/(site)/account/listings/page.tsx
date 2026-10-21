import Link from "next/link";
import { ImageOff, Plus } from "lucide-react";
import { ListingRowActions } from "@/components/account/listing-row-actions";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { fmt } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import { formatListingPrice } from "@/lib/listing-format";
import { listingPath } from "@/lib/slug";
import { cn } from "@/lib/cn";
import { requireUserPage } from "@/server/auth/current";
import { countUserListingsByStatus, getUserListings, type ListingStatus } from "@/server/services/listings";
import { mediaUrl } from "@/server/storage";

const TABS: (ListingStatus | "all")[] = ["all", "active", "pending", "draft", "rejected", "archived", "sold"];
const TONE: Record<ListingStatus, "success" | "warn" | "neutral" | "danger" | "info"> = {
  active: "success",
  pending: "warn",
  draft: "neutral",
  rejected: "danger",
  archived: "neutral",
  sold: "info",
  blocked: "danger",
};

export default async function MyListingsPage({ searchParams }: PageProps<"/account/listings">) {
  const user = await requireUserPage("/account/listings");
  const sp = await searchParams;
  const status = (TABS as string[]).includes(String(sp.status)) ? (sp.status as ListingStatus | "all") : "all";
  const [{ locale, t }, items, counts] = await Promise.all([getI18n(), getUserListings(user.id, status), countUserListingsByStatus(user.id)]);
  const label: Record<string, string> = {
    all: t.account.all,
    active: t.account.active,
    pending: t.account.pending,
    draft: t.account.drafts,
    rejected: t.account.rejected,
    archived: t.account.archive,
    sold: t.account.sold,
  };
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-1">{t.account.listings}</h1>
        <LinkButton href="/post" variant="accent" size="sm">
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          {t.nav.post}
        </LinkButton>
      </div>
      <div className="scrollbar-none -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {TABS.map((s) => {
          const n = s === "all" ? total : (counts[s] ?? 0);
          return (
            <Link
              key={s}
              href={s === "all" ? "/account/listings" : `/account/listings?status=${s}`}
              aria-current={status === s ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold",
                status === s ? "bg-ink text-white" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-soft",
              )}
            >
              {label[s]} <span className={status === s ? "text-white/60" : "text-subtle"}>{n}</span>
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={t.account.empty}
          action={
            <LinkButton href="/post" variant="primary">
              {t.nav.post}
            </LinkButton>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((l) => {
            const thumb = mediaUrl(l.thumbKey);
            const editable = l.status !== "blocked";
            return (
              <li key={l.id} className="flex gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-3 md:gap-4 md:p-4">
                <Link href={l.status === "draft" ? `/post/${l.id}` : listingPath(l)} className="block h-20 w-24 shrink-0 overflow-hidden rounded-[12px] bg-soft md:h-24 md:w-32">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-subtle">
                      <ImageOff className="h-6 w-6" strokeWidth={1.4} />
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[l.status]}>{t.status[l.status]}</Badge>
                    {l.featuredUntil && l.featuredUntil > new Date() && <Badge tone="lime">{t.listing.featured}</Badge>}
                    {l.highlightUntil && l.highlightUntil > new Date() && <Badge tone="lime">{t.listing.highlighted}</Badge>}
                  </div>
                  <Link href={l.status === "draft" ? `/post/${l.id}` : listingPath(l)} className="mt-1.5 block truncate font-bold hover:underline">
                    {l.title || "—"}
                  </Link>
                  <p className="text-sm font-semibold text-ink-2">{formatListingPrice({ ...l, isNegotiable: false }, t, locale)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(l.updatedAt, locale)} · {t.account.views}: {l.viewsCount} · {t.account.favoritesCount}: {l.favoritesCount}
                  </p>
                  {l.rejectionReason && (l.status === "rejected" || l.status === "blocked") && (
                    <p className="mt-2 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{fmt(t.account.reason, { reason: l.rejectionReason })}</p>
                  )}
                </div>
                {editable && <ListingRowActions id={l.id} status={l.status} type={l.type} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

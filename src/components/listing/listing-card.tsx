import Link from "next/link";
import { ImageOff } from "lucide-react";
import { tr, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dict/ru";
import { formatRelative } from "@/lib/format";
import { conditionLabel, formatListingPrice, typeLabel } from "@/lib/listing-format";
import { listingPath } from "@/lib/slug";
import { cn } from "@/lib/cn";
import { mediaUrl } from "@/server/storage";
import type { ListingCard as Card } from "@/server/services/search";
import { FavoriteButton } from "./favorite-button";

export function ListingCard({
  item,
  t,
  locale,
  loggedIn,
  priority,
}: {
  item: Card;
  t: Dict;
  locale: Locale;
  loggedIn: boolean;
  priority?: boolean;
}) {
  const href = listingPath(item);
  const img = mediaUrl(item.thumbKey);
  const cond = item.type === "sale" ? conditionLabel(item.condition, t) : null;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface transition-shadow hover:shadow-[var(--shadow-pop)]",
        item.highlighted ? "ring-2 ring-lime" : "ring-1 ring-line",
      )}
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-soft" tabIndex={-1} aria-hidden>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- already resized/optimized at upload time
          <img
            src={img}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-subtle">
            <ImageOff className="h-8 w-8" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.featured && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-lime">{t.listing.featured}</span>}
          {cond && <span className="rounded-full bg-surface/95 px-2 py-0.5 text-[11px] font-bold text-ink">{cond}</span>}
          {item.type !== "sale" && (
            <span className="rounded-full bg-surface/95 px-2 py-0.5 text-[11px] font-bold text-ink">{typeLabel(item.type, t)}</span>
          )}
        </div>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton listingId={item.id} initial={!!item.isFavorite} loggedIn={loggedIn} variant="overlay" />
      </div>
      <div className="flex flex-1 flex-col p-3 md:p-3.5">
        <p className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">{formatListingPrice(item, t, locale)}</p>
        <h3 className="mt-1 line-clamp-2 text-[14.5px] leading-snug text-ink-2">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {item.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-center gap-1.5 pt-2.5 text-[12.5px] text-muted">
          <span className="truncate">{item.cityName ? tr(item.cityName, locale) : ""}</span>
          {item.publishedAt && (
            <time className="ml-auto shrink-0" dateTime={new Date(item.publishedAt).toISOString()}>
              {formatRelative(item.publishedAt, locale)}
            </time>
          )}
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5", className)}>{children}</div>;
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-surface ring-1 ring-line">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3.5">
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

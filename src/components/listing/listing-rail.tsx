import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dict/ru";
import type { ListingCard as Card } from "@/server/services/search";
import { SectionHeader } from "../ui/misc";
import { ListingCard, ListingGrid } from "./listing-card";

/** A titled block of listing cards with an optional "see all" link. Renders nothing when empty. */
export function ListingSection({
  title,
  subtitle,
  href,
  items,
  t,
  locale,
  loggedIn,
  limit = 10,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  items: Card[];
  t: Dict;
  locale: Locale;
  loggedIn: boolean;
  limit?: number;
}) {
  if (!items.length) return null;
  return (
    <section className="container-x mt-12 md:mt-14">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          href ? (
            <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink">
              {t.home.showAll}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />
      <ListingGrid>
        {items.slice(0, limit).map((item) => (
          <ListingCard key={item.id} item={item} t={t} locale={locale} loggedIn={loggedIn} />
        ))}
      </ListingGrid>
    </section>
  );
}

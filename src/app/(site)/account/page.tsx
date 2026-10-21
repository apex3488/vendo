import Link from "next/link";
import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { fmt } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatRelative } from "@/lib/format";
import { requireUserPage } from "@/server/auth/current";
import { getStatsForUser } from "@/server/services/engagement";
import { countUserListingsByStatus, getListingLimit } from "@/server/services/listings";
import { listNotifications } from "@/server/services/notifications";
import { getStoreByOwner } from "@/server/services/stores";

export default async function AccountOverview() {
  const user = await requireUserPage("/account");
  const [{ locale, t }, counts, limit, stats, notes, store] = await Promise.all([
    getI18n(),
    countUserListingsByStatus(user.id),
    getListingLimit(user.id),
    getStatsForUser(user.id, 30),
    listNotifications(user.id, 5),
    getStoreByOwner(user.id),
  ]);
  const used = (counts.active ?? 0) + (counts.pending ?? 0);
  const tiles = [
    { label: t.account.active, value: counts.active ?? 0, href: "/account/listings?status=active" },
    { label: t.account.pending, value: counts.pending ?? 0, href: "/account/listings?status=pending" },
    { label: t.account.drafts, value: counts.draft ?? 0, href: "/account/listings?status=draft" },
    { label: t.account.rejected, value: counts.rejected ?? 0, href: "/account/listings?status=rejected" },
  ];
  const messages = t.notifications as Record<string, string>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-1">{fmt(t.account.hello, { name: user.displayName })}</h1>
          <p className="mt-1.5 text-sm text-muted">{fmt(t.account.limit, { used, limit })}</p>
        </div>
        <LinkButton href="/post" variant="accent">
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          {t.nav.post}
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition-colors hover:border-ink/30">
            <p className="text-sm text-muted">{tile.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{tile.value}</p>
          </Link>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="t-3">{t.account.last30}</h2>
          <Link href="/account/stats" className="text-sm font-semibold text-muted hover:text-ink">
            {t.home.showAll}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            [t.account.views, stats.totals.views],
            [t.account.phoneReveals, stats.totals.phoneReveals + stats.totals.callClicks],
            [t.account.telegramClicks, stats.totals.telegramClicks],
            [t.account.favoritesCount, stats.totals.favorites],
          ].map(([l, v]) => (
            <div key={l as string}>
              <p className="text-sm text-muted">{l}</p>
              <p className="text-2xl font-extrabold">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="t-3">{t.account.notifications}</h2>
            <Link href="/account/notifications" className="text-sm font-semibold text-muted hover:text-ink">
              {t.home.showAll}
            </Link>
          </div>
          {notes.length ? (
            <ul className="mt-3 divide-y divide-line">
              {notes.map((n) => (
                <li key={n.id} className="py-2.5 text-sm">
                  <p className={n.readAt ? "text-ink-2" : "font-semibold"}>{fmt(messages[n.type] ?? n.type, n.params)}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatRelative(n.createdAt, locale)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">{t.account.noNotifications}</p>
          )}
        </Card>
        <Card className="flex flex-col p-5">
          <h2 className="t-3">{t.account.store}</h2>
          <p className="mt-2 text-sm text-muted">{store ? store.name : t.store.intro}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <LinkButton href="/account/store" variant={store ? "secondary" : "primary"} size="sm">
              {store ? t.store.edit : t.store.create}
            </LinkButton>
            {store && (
              <LinkButton href={`/store/${store.slug}`} variant="ghost" size="sm">
                {t.store.openPage}
              </LinkButton>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

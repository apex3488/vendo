import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";
import { listingPath } from "@/lib/slug";
import { requireUserPage } from "@/server/auth/current";
import { getStatsForUser } from "@/server/services/engagement";

export default async function StatsPage() {
  const user = await requireUserPage("/account/stats");
  const [{ t }, stats] = await Promise.all([getI18n(), getStatsForUser(user.id, 30)]);

  // Fill missing days so the chart shows a continuous 30-day range.
  const days: { day: string; views: number; contacts: number }[] = [];
  const map = new Map(stats.series.map((s) => [String(s.day), s]));
  for (const d of lastDays(30)) {
    const s = map.get(d);
    days.push({ day: d, views: Number(s?.views ?? 0), contacts: Number((s?.phoneReveals ?? 0) + (s?.callClicks ?? 0) + (s?.telegramClicks ?? 0)) });
  }
  const max = Math.max(1, ...days.map((d) => d.views));
  const totals = [
    [t.account.views, stats.totals.views],
    [t.account.phoneReveals, stats.totals.phoneReveals],
    [t.account.calls, stats.totals.callClicks],
    [t.account.telegramClicks, stats.totals.telegramClicks],
    [t.account.favoritesCount, stats.totals.favorites],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-1">{t.account.stats}</h1>
        <p className="mt-1.5 text-sm text-muted">{t.account.last30}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {totals.map(([l, v]) => (
          <Card key={l} className="p-4">
            <p className="text-sm text-muted">{l}</p>
            <p className="mt-1 text-2xl font-extrabold">{v}</p>
          </Card>
        ))}
      </div>
      {stats.totals.views === 0 ? (
        <EmptyState icon={<BarChart3 className="h-6 w-6" />} title={t.account.noStats} />
      ) : (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-4 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-ink" />
              {t.account.views}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-lime-strong" />
              {t.account.contacts}
            </span>
          </div>
          <div className="flex h-48 items-end gap-[3px]" role="img" aria-label={t.account.last30}>
            {days.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.views} / ${d.contacts}`}>
                <div className="w-full rounded-t-[3px] bg-ink/85" style={{ height: `${(d.views / max) * 100}%` }} />
                {d.contacts > 0 && <div className="absolute bottom-0 w-full rounded-t-[3px] bg-lime-strong" style={{ height: `${(d.contacts / max) * 100}%` }} />}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-subtle">
            <span>{days[0]!.day.slice(5)}</span>
            <span>{days[days.length - 1]!.day.slice(5)}</span>
          </div>
        </Card>
      )}
      {stats.perListing.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="t-3 px-5 pt-5">{t.account.byListing}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">{t.promo.listing}</th>
                  <th className="px-3 py-2.5 text-right font-semibold">{t.account.views}</th>
                  <th className="px-3 py-2.5 text-right font-semibold">{t.account.contacts}</th>
                  <th className="px-5 py-2.5 text-right font-semibold">{t.account.favoritesCount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.perListing.map((l) => (
                  <tr key={l.id}>
                    <td className="max-w-[280px] truncate px-5 py-2.5">
                      <Link href={listingPath(l)} className="font-medium hover:underline">
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{l.views}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{l.contacts}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{l.favorites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function lastDays(n: number): string[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => new Date(now - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

import Link from "next/link";
import { CancelPromotionButton, PromotionRequestForm } from "@/components/account/forms";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/misc";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { listingPath } from "@/lib/slug";
import { requireUserPage } from "@/server/auth/current";
import { getUserListings } from "@/server/services/listings";
import { getPromotionPlans, getUserPromotions } from "@/server/services/monetization";
import { getSettings } from "@/server/services/settings";

export default async function PromotionsPage({ searchParams }: PageProps<"/account/promotions">) {
  const user = await requireUserPage("/account/promotions");
  const sp = await searchParams;
  const [{ locale, t }, listings, plans, mine, settings] = await Promise.all([
    getI18n(),
    getUserListings(user.id, "active"),
    getPromotionPlans(),
    getUserPromotions(user.id),
    getSettings(),
  ]);
  const typeName = { bump: t.promo.typeBump, highlight: t.promo.typeHighlight, featured: t.promo.typeFeatured };
  const planOptions = plans.map((p) => ({
    id: p.id,
    label: `${tr(p.name, locale)} — ${formatMoney(p.price, p.currency, locale)}${p.type !== "bump" ? ` · ${fmt(t.promo.days, { n: p.durationDays })}` : ""}`,
  }));

  return (
    <div className="space-y-6">
      <h1 className="t-1">{t.promo.title}</h1>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="p-5">
            <Badge tone="lime">{typeName[p.type]}</Badge>
            <p className="mt-3 font-bold">{tr(p.name, locale)}</p>
            <p className="mt-1 text-sm text-muted">{tr(p.description, locale)}</p>
            <p className="mt-3 text-xl font-extrabold">{formatMoney(p.price, p.currency, locale)}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5 md:p-7">
        <h2 className="t-3 mb-4">{t.promo.choose}</h2>
        <PromotionRequestForm
          listings={listings.map((l) => ({ id: l.id, title: l.title }))}
          plans={planOptions}
          defaultListing={Number(sp.listing) || undefined}
        />
        <p className="mt-4 text-sm text-muted">{settings.manualPaymentInstructions || t.promo.pendingNote}</p>
        <p className="mt-1 text-xs text-subtle">{t.promo.disclaimer}</p>
      </Card>

      <div>
        <h2 className="t-2 mb-4">{t.promo.my}</h2>
        {mine.length === 0 ? (
          <EmptyState title={t.promo.none} />
        ) : (
          <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
            {mine.map((m) => (
              <li key={m.promo.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={listingPath({ id: m.promo.listingId, slug: m.slug })} className="font-semibold hover:underline">
                    {m.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {tr(m.plan.name, locale)} · {formatMoney(m.plan.price, m.plan.currency, locale)}
                    {m.promo.endsAt && ` · ${fmt(t.promo.until, { date: formatDate(m.promo.endsAt, locale) })}`}
                  </p>
                  {m.result && <p className="mt-1 text-sm text-ink-2">{fmt(t.promo.result, { views: m.result.views, contacts: m.result.contacts })}</p>}
                </div>
                <Badge tone={m.promo.status === "active" ? "success" : m.promo.status === "pending_payment" ? "warn" : "neutral"}>{t.paid[m.promo.status]}</Badge>
                {m.promo.status === "pending_payment" && <CancelPromotionButton id={m.promo.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
      {mine.some((m) => m.promo.status === "pending_payment") && <Alert tone="warn">{t.promo.pendingNote}</Alert>}
    </div>
  );
}

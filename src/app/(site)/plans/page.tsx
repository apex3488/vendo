import type { Metadata } from "next";
import { PlanCards } from "@/components/plan-cards";
import { LinkButton } from "@/components/ui/button";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { getPromotionPlans, getSubscriptionPlans } from "@/server/services/monetization";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.plans.title, alternates: { canonical: "/plans" } };
}

export default async function PlansPage() {
  const [{ locale, t }, plans, promos] = await Promise.all([getI18n(), getSubscriptionPlans(), getPromotionPlans()]);
  return (
    <div className="container-x pt-8 md:pt-12">
      <h1 className="t-display max-w-2xl">{t.plans.title}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t.home.storesText}</p>
      <div className="mt-8">
        <PlanCards
          plans={plans}
          t={t}
          locale={locale}
          action={() => (
            <LinkButton href="/account/subscription" variant="secondary" className="w-full">
              {t.plans.request}
            </LinkButton>
          )}
        />
      </div>
      <p className="mt-4 text-sm text-muted">{t.plans.pendingNote}</p>

      <h2 className="t-1 mt-14">{t.promo.title}</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {promos.map((p) => (
          <div key={p.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
            <p className="font-bold">{tr(p.name, locale)}</p>
            <p className="mt-1 text-sm text-muted">{tr(p.description, locale)}</p>
            <p className="mt-3 text-xl font-extrabold">{formatMoney(p.price, p.currency, locale)}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{t.promo.disclaimer}</p>
    </div>
  );
}

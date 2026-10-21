import { RequestPlanButton } from "@/components/account/forms";
import { PlanCards } from "@/components/plan-cards";
import { LinkButton } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/misc";
import { fmt, tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUserPage } from "@/server/auth/current";
import { getSubscriptionPlans } from "@/server/services/monetization";
import { getSettings } from "@/server/services/settings";
import { getActiveSubscription, getStoreByOwner, getSubscriptionHistory } from "@/server/services/stores";

export default async function SubscriptionPage() {
  const user = await requireUserPage("/account/subscription");
  const [{ locale, t }, store, plans, settings] = await Promise.all([getI18n(), getStoreByOwner(user.id), getSubscriptionPlans(), getSettings()]);
  const [active, history] = store ? await Promise.all([getActiveSubscription(store.id), getSubscriptionHistory(store.id)]) : [null, []];
  const pending = history.find((h) => h.sub.status === "pending_payment");
  const freePlan = plans.find((p) => p.price === 0);

  return (
    <div className="space-y-6">
      <h1 className="t-1">{t.plans.title}</h1>
      {!store && (
        <Alert tone="warn" title={t.plans.needStore}>
          <LinkButton href="/account/store" variant="primary" size="sm" className="mt-3">
            {t.store.create}
          </LinkButton>
        </Alert>
      )}
      {active && (
        <Alert tone="success" title={`${t.plans.current}: ${tr(active.plan.name, locale)}`}>
          {active.sub.endsAt && fmt(t.plans.activeUntil, { date: formatDate(active.sub.endsAt, locale) })}
        </Alert>
      )}
      {pending && <Alert tone="warn" title={`${t.plans.requested}: ${tr(pending.plan.name, locale)}`}>{settings.manualPaymentInstructions || t.plans.pendingNote}</Alert>}
      <PlanCards
        plans={plans}
        t={t}
        locale={locale}
        currentPlanId={active?.plan.id ?? (store ? freePlan?.id : null)}
        action={(p) => (p.price > 0 && store ? <RequestPlanButton planId={p.id} disabled={store.status !== "active"} /> : null)}
      />
      <p className="text-sm text-muted">{t.plans.pendingNote}</p>
      {history.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="t-3 px-5 pt-5">{t.plans.history}</h2>
          <ul className="mt-3 divide-y divide-line">
            {history.map((h) => (
              <li key={h.sub.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="font-semibold">{tr(h.plan.name, locale)} · {formatMoney(h.plan.price, h.plan.currency, locale)}</span>
                <span className="flex items-center gap-2 text-muted">
                  {h.sub.startsAt && h.sub.endsAt && `${formatDate(h.sub.startsAt, locale)} — ${formatDate(h.sub.endsAt, locale)}`}
                  <Badge tone={h.sub.status === "active" ? "success" : h.sub.status === "pending_payment" ? "warn" : "neutral"}>{t.paid[h.sub.status]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

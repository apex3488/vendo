import { Check } from "lucide-react";
import { fmt, tr, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dict/ru";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { subscriptionPlans } from "@/server/db/schema";

type Plan = typeof subscriptionPlans.$inferSelect;

export function PlanCards({
  plans,
  t,
  locale,
  currentPlanId,
  action,
}: {
  plans: Plan[];
  t: Dict;
  locale: Locale;
  currentPlanId?: number | null;
  action?: (plan: Plan) => React.ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p, i) => {
        const featured = i === 1;
        const features = [
          fmt(t.plans.listingLimit, { n: p.listingLimit }),
          p.features.storePage && t.plans.storePage,
          p.features.customLogo && t.plans.customLogo,
          p.features.analytics && t.plans.analytics,
          p.features.freeBumpsPerMonth ? fmt(t.plans.freeBumps, { n: p.features.freeBumpsPerMonth }) : null,
        ].filter(Boolean) as string[];
        return (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-[var(--radius-xl)] border p-6",
              featured ? "border-ink bg-ink text-white" : "border-line bg-surface",
              currentPlanId === p.id && "ring-2 ring-lime",
            )}
          >
            <p className={cn("text-sm font-bold uppercase tracking-wider", featured ? "text-lime" : "text-muted")}>{tr(p.name, locale)}</p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight">
              {p.price > 0 ? formatMoney(p.price, p.currency, locale) : t.plans.free}
            </p>
            {p.price > 0 && <p className={cn("text-sm", featured ? "text-white/60" : "text-muted")}>/ {p.periodDays} {locale === "en" ? "days" : locale === "uz" ? "kun" : "дн."}</p>}
            {p.description && <p className={cn("mt-3 text-sm", featured ? "text-white/70" : "text-muted")}>{tr(p.description, locale)}</p>}
            <ul className="mt-5 space-y-2.5 text-[15px]">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-lime" : "text-success")} strokeWidth={2.6} />
                  {f}
                </li>
              ))}
            </ul>
            {currentPlanId === p.id && <p className="mt-5 text-sm font-semibold">{t.plans.current}</p>}
            {action && <div className="mt-auto pt-6">{action(p)}</div>}
          </div>
        );
      })}
    </div>
  );
}

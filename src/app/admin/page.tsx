import Link from "next/link";
import { APanel } from "@/components/admin/fields";
import { requirePermissionPage } from "@/server/auth/current";
import { getDashboardStats } from "@/server/services/admin-stats";
import { maybeRunMaintenance } from "@/server/services/maintenance";

export default async function AdminDashboard() {
  await requirePermissionPage("admin.access");
  await maybeRunMaintenance();
  const s = await getDashboardStats();
  const tiles = [
    { label: "Пользователей", value: s.usersTotal, href: "/admin/users" },
    { label: "Новых за 7 дней", value: s.usersNew, href: "/admin/users" },
    { label: "Активных объявлений", value: s.active, href: "/admin/listings?status=active" },
    { label: "На модерации", value: s.pending, href: "/admin/listings?status=pending", accent: s.pending > 0 },
    { label: "Открытых жалоб", value: s.openReports, href: "/admin/reports", accent: s.openReports > 0 },
    { label: "Активных магазинов", value: s.activeStores, href: "/admin/stores" },
    { label: "Активных подписок", value: s.activeSubs, href: "/admin/monetization" },
    { label: "Заявок на оплату", value: s.pendingPaid, href: "/admin/monetization", accent: s.pendingPaid > 0 },
  ];
  const max = Math.max(1, ...s.registrations.map((r) => r.n));
  return (
    <div className="space-y-6">
      <h1 className="t-1">Обзор</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-[var(--radius-lg)] border p-4 transition-colors hover:border-ink/30 ${t.accent ? "border-lime-strong bg-lime-soft" : "border-line bg-surface"}`}>
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{t.value}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <APanel title="Регистрации за 14 дней">
          {s.registrations.length ? (
            <div className="flex h-40 items-end gap-1.5">
              {s.registrations.map((r) => (
                <div key={r.day} className="flex flex-1 flex-col items-center gap-1" title={`${r.day}: ${r.n}`}>
                  <span className="text-[10px] font-semibold text-muted">{r.n}</span>
                  <div className="w-full rounded-t bg-ink" style={{ height: `${(r.n / max) * 120}px` }} />
                  <span className="text-[10px] text-subtle">{r.day.slice(8)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Пока нет регистраций.</p>
          )}
        </APanel>
        <APanel title="Доходы от монетизации">
          {s.paymentsConnected ? (
            <p className="text-sm">Платёжные данные доступны в разделе «Монетизация».</p>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              Платёжный провайдер не подключён, поэтому доходы не отображаются. Платные заявки активируются вручную после подтверждения
              оплаты и фиксируются в журнале действий. Активных продвижений: <b className="text-ink">{s.activePromotions}</b>, активных подписок:{" "}
              <b className="text-ink">{s.activeSubs}</b>.
            </p>
          )}
        </APanel>
      </div>
    </div>
  );
}

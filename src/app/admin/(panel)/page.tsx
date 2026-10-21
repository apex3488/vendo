import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleDollarSign, Clock, Flag, ListChecks, Store, UserPlus, Users } from "lucide-react";
import { moderateListingAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { APanel } from "@/components/admin/fields";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermissionPage } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { adminListListings } from "@/server/services/admin-listings";
import { getDashboardStats } from "@/server/services/admin-stats";
import { maybeRunMaintenance } from "@/server/services/maintenance";
import { mediaUrl } from "@/server/storage";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("ru-RU", { hour: "numeric", hour12: false, timeZone: "Asia/Tashkent" }).format(new Date()));
  return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}

/** Always N bars (days without sign-ups as zero) so one busy day does not fill the whole chart. */
function lastDays(rows: { day: string; n: number }[], count: number) {
  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(now - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, n: byDay.get(day) ?? 0 };
  });
}

export default async function AdminDashboard() {
  const user = await requirePermissionPage("admin.access");
  await maybeRunMaintenance();
  const canSeeListings = can(user.role, "listings.view_all");
  const canModerate = can(user.role, "listings.moderate");
  const [s, queue] = await Promise.all([getDashboardStats(), canSeeListings ? adminListListings({ status: "pending", page: 1 }) : null]);

  const tiles = [
    { label: "На модерации", value: s.pending, href: "/admin/listings?status=pending", icon: Clock, accent: s.pending > 0 },
    { label: "Открытых жалоб", value: s.openReports, href: "/admin/reports", icon: Flag, alert: s.openReports > 0 },
    { label: "Активных объявлений", value: s.active, href: "/admin/listings?status=active", icon: ListChecks },
    { label: "Пользователей", value: s.usersTotal, href: "/admin/users", icon: Users },
    { label: "Новых за 7 дней", value: s.usersNew, href: "/admin/users", icon: UserPlus },
    { label: "Активных магазинов", value: s.activeStores, href: "/admin/stores", icon: Store },
    { label: "Активных подписок", value: s.activeSubs, href: "/admin/monetization", icon: BadgeCheck },
    { label: "Заявок на оплату", value: s.pendingPaid, href: "/admin/monetization", icon: CircleDollarSign, accent: s.pendingPaid > 0 },
  ];
  const days = lastDays(s.registrations, 14);
  const max = Math.max(1, ...days.map((r) => r.n));
  const preview = queue?.items.slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted">{greeting()},</p>
        <h1 className="t-1">{user.displayName}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn(
              "group rounded-[var(--radius-lg)] border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]",
              t.accent ? "border-ink bg-ink text-white" : t.alert ? "border-danger/30 bg-danger-soft" : "border-line bg-surface",
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span className={cn("text-[13px] font-semibold leading-tight", t.accent ? "text-white/70" : "text-muted")}>{t.label}</span>
              <t.icon className={cn("h-[18px] w-[18px] shrink-0", t.accent ? "text-lime" : t.alert ? "text-danger" : "text-subtle")} />
            </span>
            <span className="mt-2 block text-[30px] font-extrabold leading-none tracking-tight">{t.value}</span>
          </Link>
        ))}
      </div>

      {queue && (
        <APanel
          title={
            <span className="flex items-center gap-2">
              Очередь модерации
              {queue.total > 0 && <span className="rounded-full bg-danger px-2 text-xs font-bold leading-5 text-white">{queue.total}</span>}
            </span>
          }
          actions={
            <Link href="/admin/listings?status=pending" className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
              Вся очередь <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {preview.length ? (
            <ul className="-my-2 divide-y divide-line">
              {preview.map((l) => (
                <li key={l.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <Link href={`/admin/listings/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    {l.thumbKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(l.thumbKey)!} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
                    ) : (
                      <span className="h-14 w-14 shrink-0 rounded-[10px] bg-soft" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold hover:underline">{l.title || "—"}</span>
                      <span className="block text-sm text-muted">
                        {l.price != null ? formatMoney(l.price, l.currency, "ru") : "Цена не указана"} · {l.userName}
                      </span>
                      <span className="block text-xs text-subtle">{formatDateTime(l.updatedAt, "ru")}</span>
                    </span>
                  </Link>
                  {canModerate && (
                    <span className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                      <ActionButton run={moderateListingAction.bind(null, l.id, "approve")} variant="accent">
                        Одобрить
                      </ActionButton>
                      <Link href={`/admin/listings/${l.id}`} className="inline-flex h-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-semibold hover:bg-canvas">
                        Проверить
                      </Link>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center">
              <p className="text-2xl">🎉</p>
              <p className="mt-1 font-semibold">Очередь пуста</p>
              <p className="text-sm text-muted">Новые объявления появятся здесь, а модераторы получат уведомление.</p>
            </div>
          )}
        </APanel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <APanel title="Регистрации за 14 дней">
          {s.registrations.length ? (
            <div className="flex h-40 items-end gap-1.5">
              {days.map((r) => (
                <div key={r.day} className="flex flex-1 flex-col items-center gap-1" title={`${r.day}: ${r.n}`}>
                  <span className="text-[10px] font-semibold text-muted">{r.n || ""}</span>
                  <div className={cn("w-full rounded-t-md transition-colors hover:bg-lime-strong", r.n ? "bg-ink" : "bg-soft")} style={{ height: `${Math.max(3, (r.n / max) * 110)}px` }} />
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

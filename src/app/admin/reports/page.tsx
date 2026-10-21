import Link from "next/link";
import { resolveReportAction } from "../actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/misc";
import { REPORT_REASON_RU, STATUS_RU } from "@/lib/admin-labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requirePermissionPage } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { adminListReports } from "@/server/services/reports";

export default async function AdminReports({ searchParams }: PageProps<"/admin/reports">) {
  const actor = await requirePermissionPage("reports.view");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, perPage } = await adminListReports({ status, page });
  const canHandle = can(actor.role, "reports.handle");

  return (
    <div className="space-y-5">
      <h1 className="t-1">Жалобы</h1>
      <div className="flex gap-1.5">
        {[
          ["open", "Открытые"],
          ["resolved", "Решённые"],
          ["dismissed", "Отклонённые"],
          ["", "Все"],
        ].map(([s, l]) => (
          <Link key={s} href={`?status=${s}`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", status === s ? "bg-ink text-white" : "bg-surface ring-1 ring-line hover:bg-soft")}>
            {l}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted">Всего: {total}</p>
      <ul className="space-y-3">
        {items.map(({ r, listingTitle, listingStatus, targetName, reporterName, reportsOnTarget }) => {
          const resolve = async (st: "resolved" | "dismissed", text: string) => {
            "use server";
            return resolveReportAction(r.id, st, text);
          };
          return (
            <li key={r.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="danger">{REPORT_REASON_RU[r.reason] ?? r.reason}</Badge>
                <Badge>{r.targetType === "listing" ? "Объявление" : "Пользователь"}</Badge>
                <Badge tone={r.status === "open" ? "warn" : "neutral"}>{r.status === "open" ? "Открыта" : r.status === "resolved" ? "Решена" : "Отклонена"}</Badge>
                <span className="text-muted">
                  №{r.id} · {formatDateTime(r.createdAt, "ru")} · от {reporterName ?? "удалённого пользователя"}
                </span>
              </div>
              <div className="mt-2 text-sm">
                {r.listingId && (
                  <p>
                    Объявление:{" "}
                    <Link href={`/admin/listings/${r.listingId}`} className="font-semibold hover:underline">
                      {listingTitle}
                    </Link>{" "}
                    <span className="text-muted">({listingStatus ? STATUS_RU[listingStatus] : "—"})</span>
                  </p>
                )}
                {r.targetUserId && (
                  <p>
                    Пользователь:{" "}
                    <Link href={`/admin/users/${r.targetUserId}`} className="font-semibold hover:underline">
                      {targetName}
                    </Link>{" "}
                    <span className="text-muted">(всего жалоб на пользователя: {reportsOnTarget})</span>
                  </p>
                )}
                {r.details && <p className="mt-2 whitespace-pre-line rounded-[10px] bg-canvas p-3">{r.details}</p>}
                {r.resolution && <p className="mt-2 text-muted">Решение: {r.resolution}</p>}
              </div>
              {canHandle && r.status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton run={resolve.bind(null, "resolved")} variant="primary" prompt="Принятое решение (например, «объявление заблокировано»):" promptRequired>
                    Решено
                  </ActionButton>
                  <ActionButton run={resolve.bind(null, "dismissed")} variant="ghost" prompt="Почему жалоба отклонена:">
                    Отклонить жалобу
                  </ActionButton>
                </div>
              )}
            </li>
          );
        })}
        {!items.length && <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-10 text-center text-muted">Жалоб нет</li>}
      </ul>
      <div className="flex gap-2">
        {page > 1 && <Link href={`?status=${status}&page=${page - 1}`} className="text-sm font-semibold">← Назад</Link>}
        {page * perPage < total && <Link href={`?status=${status}&page=${page + 1}`} className="text-sm font-semibold">Вперёд →</Link>}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ATable } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";
import { requirePermissionPage } from "@/server/auth/current";
import { listAudit } from "@/server/services/admin-stats";

export default async function AdminAudit({ searchParams }: PageProps<"/admin/audit">) {
  await requirePermissionPage("audit.view");
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await listAudit({ page, action: action || undefined });
  return (
    <div className="space-y-5">
      <h1 className="t-1">Журнал действий</h1>
      <form className="flex gap-2">
        <input name="action" defaultValue={action} placeholder="Действие, например listing." className="h-10 w-64 rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink" />
        <button className="h-10 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">Фильтр</button>
      </form>
      <ATable head={["Когда", "Кто", "Действие", "Объект", "Результат", "Детали"]}>
        {rows.map(({ log, actorName }) => (
          <tr key={log.id} className="align-top">
            <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(log.createdAt, "ru")}</td>
            <td className="px-4 py-2">
              {log.actorId ? (
                <Link href={`/admin/users/${log.actorId}`} className="hover:underline">
                  {actorName ?? log.actorId}
                </Link>
              ) : (
                <span className="text-muted">система / CLI</span>
              )}
            </td>
            <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
            <td className="px-4 py-2 text-xs">
              {log.entityType} {log.entityId}
            </td>
            <td className="px-4 py-2">
              <Badge tone={log.result === "success" ? "success" : "danger"}>{log.result}</Badge>
            </td>
            <td className="max-w-[320px] break-words px-4 py-2 font-mono text-[11px] text-muted">{log.meta ? JSON.stringify(log.meta) : ""}</td>
          </tr>
        ))}
        {!rows.length && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-muted">
              Записей нет
            </td>
          </tr>
        )}
      </ATable>
      <div className="flex gap-3 text-sm font-semibold">
        {page > 1 && <Link href={`?action=${action}&page=${page - 1}`}>← Назад</Link>}
        {rows.length === 50 && <Link href={`?action=${action}&page=${page + 1}`}>Вперёд →</Link>}
      </div>
    </div>
  );
}

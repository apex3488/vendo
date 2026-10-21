import Link from "next/link";
import { ATable } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requirePermissionPage } from "@/server/auth/current";
import { adminListListings } from "@/server/services/admin-listings";
import { mediaUrl } from "@/server/storage";
import { STATUS_RU } from "@/lib/admin-labels";

const STATUSES: [string, string][] = [
  ["pending", "На модерации"],
  ["active", "Активные"],
  ["rejected", "Отклонённые"],
  ["blocked", "Заблокированные"],
  ["archived", "Архив"],
  ["sold", "Проданные"],
  ["draft", "Черновики"],
  ["", "Все"],
];

export default async function AdminListings({ searchParams }: PageProps<"/admin/listings">) {
  await requirePermissionPage("listings.view_all");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "pending";
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, perPage } = await adminListListings({ status, q, page });
  const qs = (o: Record<string, string | number>) => {
    const p = new URLSearchParams({ status, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) });
    return `?${p}`;
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-1">Объявления</h1>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="ID, заголовок или автор" className="h-10 w-64 rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink" />
          <button className="h-10 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">Найти</button>
        </form>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map(([s, l]) => (
          <Link key={s} href={`?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", status === s ? "bg-ink text-white" : "bg-surface ring-1 ring-line hover:bg-soft")}>
            {l}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted">Найдено: {total}</p>
      <ATable head={["", "Объявление", "Автор", "Категория", "Цена", "Статус", "Обновлено"]}>
        {items.map((l) => (
          <tr key={l.id} className="hover:bg-canvas">
            <td className="w-16 px-4 py-2">
              {l.thumbKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(l.thumbKey)!} alt="" className="h-10 w-12 rounded-md object-cover" />
              ) : (
                <div className="h-10 w-12 rounded-md bg-soft" />
              )}
            </td>
            <td className="max-w-[280px] px-4 py-2">
              <Link href={`/admin/listings/${l.id}`} className="block truncate font-semibold hover:underline">
                {l.title || "—"}
              </Link>
              <span className="text-xs text-muted">ID {l.id}</span>
              {l.reports > 0 && <Badge tone="danger" className="ml-2">жалоб: {l.reports}</Badge>}
            </td>
            <td className="px-4 py-2">
              <Link href={`/admin/users/${l.userId}`} className="hover:underline">
                {l.userName}
              </Link>
            </td>
            <td className="px-4 py-2 text-muted">{tr(l.categoryName, "ru")}</td>
            <td className="whitespace-nowrap px-4 py-2">{l.price != null ? formatMoney(l.price, l.currency, "ru") : "—"}</td>
            <td className="px-4 py-2">
              <Badge tone={l.status === "active" ? "success" : l.status === "pending" ? "warn" : l.status === "rejected" || l.status === "blocked" ? "danger" : "neutral"}>{STATUS_RU[l.status]}</Badge>
            </td>
            <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(l.updatedAt, "ru")}</td>
          </tr>
        ))}
        {!items.length && (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-muted">
              Нет объявлений
            </td>
          </tr>
        )}
      </ATable>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={qs({ page: page - 1 })} className="rounded-[10px] border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">
            ← Назад
          </Link>
        )}
        {page * perPage < total && (
          <Link href={qs({ page: page + 1 })} className="rounded-[10px] border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">
            Вперёд →
          </Link>
        )}
      </div>
    </div>
  );
}

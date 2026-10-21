import Link from "next/link";
import { ATable } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requirePermissionPage } from "@/server/auth/current";
import { adminListListings } from "@/server/services/admin-listings";
import { mediaUrl } from "@/server/storage";
import { STATUS_RU, statusTone } from "@/lib/admin-labels";
import { moderateListingAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { can } from "@/server/auth/permissions";

const REJECT_PRESETS = ["Нет фотографий или фото плохого качества", "Неверная категория", "Нереальная или неверная цена", "Недостаточно описания", "Неверные контакты", "Дубликат объявления"];

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
  const actor = await requirePermissionPage("listings.view_all");
  const canModerate = can(actor.role, "listings.moderate");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="t-1">{status === "pending" ? "Очередь модерации" : "Объявления"}</h1>
          {status === "pending" && <p className="mt-1 text-sm text-muted">Сюда попадают все новые и отредактированные объявления. Сначала самые старые.</p>}
        </div>
        <form className="flex w-full gap-2 sm:w-auto">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="ID, заголовок или автор" className="h-10 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink sm:w-64 sm:flex-none" />
          <button className="h-10 shrink-0 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">Найти</button>
        </form>
      </div>
      <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUSES.map(([s, l]) => (
          <Link key={s} href={`?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold", status === s ? "bg-ink text-white" : "bg-surface ring-1 ring-line hover:bg-soft")}>
            {l}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted">Найдено: {total}</p>
      <ul className="space-y-2.5 md:hidden">
        {items.map((l) => (
          <li key={l.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-3">
            <Link href={`/admin/listings/${l.id}`} className="flex gap-3">
              {l.thumbKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(l.thumbKey)!} alt="" className="h-[72px] w-[72px] shrink-0 rounded-[10px] object-cover" />
              ) : (
                <div className="h-[72px] w-[72px] shrink-0 rounded-[10px] bg-soft" />
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-semibold leading-snug">{l.title || "—"}</span>
                <span className="mt-0.5 block text-sm font-bold">{l.price != null ? formatMoney(l.price, l.currency, "ru") : "—"}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <Badge tone={statusTone(l.status)}>{STATUS_RU[l.status]}</Badge>
                  {l.reports > 0 && <Badge tone="danger">жалоб: {l.reports}</Badge>}
                  <span>
                    {l.userName} · {formatDateTime(l.updatedAt, "ru")}
                  </span>
                </span>
              </span>
            </Link>
            {canModerate && l.status === "pending" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ActionButton run={moderateListingAction.bind(null, l.id, "approve")} variant="accent" className="w-full">
                  Одобрить
                </ActionButton>
                <ActionButton run={moderateListingAction.bind(null, l.id, "reject")} prompt="Причина отклонения (увидит автор)" promptRequired presets={REJECT_PRESETS} className="w-full">
                  Отклонить
                </ActionButton>
              </div>
            )}
          </li>
        ))}
        {!items.length && <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-10 text-center text-muted">{status === "pending" ? "Очередь пуста — все объявления проверены 🎉" : "Нет объявлений"}</li>}
      </ul>
      <div className="hidden md:block">
      <ATable head={["", "Объявление", "Автор", "Категория", "Цена", "Статус", "Обновлено", ...(canModerate && status === "pending" ? [""] : [])]}>
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
              <Badge tone={statusTone(l.status)}>{STATUS_RU[l.status]}</Badge>
            </td>
            <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(l.updatedAt, "ru")}</td>
            {canModerate && status === "pending" && (
              <td className="whitespace-nowrap px-4 py-2 text-right">
                <span className="inline-flex gap-1.5">
                  <ActionButton run={moderateListingAction.bind(null, l.id, "approve")} variant="accent">
                    Одобрить
                  </ActionButton>
                  <ActionButton run={moderateListingAction.bind(null, l.id, "reject")} prompt="Причина отклонения (увидит автор)" promptRequired presets={REJECT_PRESETS}>
                    Отклонить
                  </ActionButton>
                </span>
              </td>
            )}
          </tr>
        ))}
        {!items.length && (
          <tr>
            <td colSpan={8} className="px-4 py-10 text-center text-muted">
              {status === "pending" ? "Очередь пуста — все объявления проверены 🎉" : "Нет объявлений"}
            </td>
          </tr>
        )}
      </ATable>
      </div>
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

import Link from "next/link";
import { setStoreStatusAction, setStoreVerifiedAction } from "../actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { ATable } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import { requirePermissionPage } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { adminListStores } from "@/server/services/stores";

export default async function AdminStores({ searchParams }: PageProps<"/admin/stores">) {
  const actor = await requirePermissionPage("stores.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, perPage } = await adminListStores({ q, status, page });
  const canVerify = can(actor.role, "stores.verify");

  return (
    <div className="space-y-5">
      <h1 className="t-1">Магазины</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Название или адрес" className="h-10 w-64 rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink" />
        <select name="status" defaultValue={status} className="h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-sm">
          <option value="">Все</option>
          <option value="active">Активные</option>
          <option value="suspended">Приостановленные</option>
        </select>
        <button className="h-10 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">Найти</button>
      </form>
      <p className="text-sm text-muted">Найдено: {total}</p>
      <ATable head={["Магазин", "Владелец", "Тариф", "Объявлений", "Статус", "Создан", "Действия"]}>
        {items.map((s) => {
          const setStatus = async (next: "active" | "suspended") => {
            "use server";
            return setStoreStatusAction(s.id, next);
          };
          const setVerified = async (v: boolean) => {
            "use server";
            return setStoreVerifiedAction(s.id, v);
          };
          return (
            <tr key={s.id} className="align-top hover:bg-canvas">
              <td className="px-4 py-2.5">
                <Link href={`/store/${s.slug}`} target="_blank" className="font-semibold hover:underline">
                  {s.name}
                </Link>
                {s.verifiedAt && <Badge tone="success" className="ml-2">проверен</Badge>}
              </td>
              <td className="px-4 py-2.5">
                <Link href={`/admin/users/${s.ownerId}`} className="hover:underline">
                  {s.ownerName}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted">{s.planName ? tr(s.planName, "ru") : "Бесплатный"}</td>
              <td className="px-4 py-2.5">{s.activeCount}</td>
              <td className="px-4 py-2.5">{s.status === "active" ? <Badge tone="success">Активен</Badge> : <Badge tone="danger">Приостановлен</Badge>}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDate(s.createdAt, "ru")}</td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {s.status === "active" ? (
                    <ActionButton run={setStatus.bind(null, "suspended")} variant="ghost" confirm="Приостановить магазин? Страница магазина станет недоступна.">
                      Приостановить
                    </ActionButton>
                  ) : (
                    <ActionButton run={setStatus.bind(null, "active")} variant="ghost">
                      Возобновить
                    </ActionButton>
                  )}
                  {canVerify &&
                    (s.verifiedAt ? (
                      <ActionButton run={setVerified.bind(null, false)} variant="ghost" confirm="Снять отметку проверки?">
                        Снять проверку
                      </ActionButton>
                    ) : (
                      <ActionButton run={setVerified.bind(null, true)} variant="ghost" confirm="Подтвердить, что документы магазина действительно проверены?">
                        Отметить проверенным
                      </ActionButton>
                    ))}
                </div>
              </td>
            </tr>
          );
        })}
        {!items.length && (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-muted">
              Магазинов пока нет
            </td>
          </tr>
        )}
      </ATable>
      <div className="flex gap-3 text-sm font-semibold">
        {page > 1 && <Link href={`?q=${q}&status=${status}&page=${page - 1}`}>← Назад</Link>}
        {page * perPage < total && <Link href={`?q=${q}&status=${status}&page=${page + 1}`}>Вперёд →</Link>}
      </div>
    </div>
  );
}

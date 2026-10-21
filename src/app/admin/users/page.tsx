import Link from "next/link";
import { ATable } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { ROLE_RU } from "@/lib/admin-labels";
import { formatDateTime } from "@/lib/format";
import { requirePermissionPage } from "@/server/auth/current";
import { adminListUsers } from "@/server/services/users";

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  await requirePermissionPage("users.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, perPage } = await adminListUsers({ q, role: role || undefined, status: status || undefined, page });
  const qs = (p: number) => `?${new URLSearchParams({ q, role, status, page: String(p) })}`;
  return (
    <div className="space-y-5">
      <h1 className="t-1">Пользователи</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Имя, email, логин, телефон" className="h-10 w-64 rounded-[10px] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink" />
        <select name="role" defaultValue={role} className="h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-sm">
          <option value="">Все роли</option>
          {Object.entries(ROLE_RU).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-sm">
          <option value="">Любой статус</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
        </select>
        <button className="h-10 rounded-[10px] bg-ink px-4 text-sm font-semibold text-white">Найти</button>
      </form>
      <p className="text-sm text-muted">Найдено: {total}</p>
      <ATable head={["Пользователь", "Email / логин", "Роль", "Статус", "Регистрация", "Последний вход"]}>
        {items.map((u) => (
          <tr key={u.id} className="hover:bg-canvas">
            <td className="px-4 py-2.5">
              <Link href={`/admin/users/${u.id}`} className="font-semibold hover:underline">
                {u.displayName}
              </Link>
            </td>
            <td className="px-4 py-2.5 text-muted">{u.email ?? u.username}</td>
            <td className="px-4 py-2.5">{ROLE_RU[u.role]}</td>
            <td className="px-4 py-2.5">{u.status === "active" ? <Badge tone="success">Активен</Badge> : <Badge tone="danger">Заблокирован</Badge>}</td>
            <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(u.createdAt, "ru")}</td>
            <td className="whitespace-nowrap px-4 py-2.5 text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt, "ru") : "—"}</td>
          </tr>
        ))}
      </ATable>
      <div className="flex gap-3 text-sm font-semibold">
        {page > 1 && <Link href={qs(page - 1)}>← Назад</Link>}
        {page * perPage < total && <Link href={qs(page + 1)}>Вперёд →</Link>}
      </div>
    </div>
  );
}

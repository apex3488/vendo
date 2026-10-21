import Link from "next/link";
import { notFound } from "next/navigation";
import { setUserBlockedAction, setUserRoleAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { APanel } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { ROLE_RU, STATUS_RU, statusTone } from "@/lib/admin-labels";
import { formatPhone } from "@/lib/contacts";
import { formatDateTime } from "@/lib/format";
import { requirePermissionPage } from "@/server/auth/current";
import { assignableRoles, can, outranks, type Role } from "@/server/auth/permissions";
import { listAudit } from "@/server/services/admin-stats";
import { adminListListings } from "@/server/services/admin-listings";
import { getStoreByOwner } from "@/server/services/stores";
import { adminGetUser } from "@/server/services/users";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminUserDetail({ params }: PageProps<"/admin/users/[id]">) {
  const actor = await requirePermissionPage("users.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const u = await adminGetUser(id);
  if (!u) notFound();
  const [store, userListings, actions] = await Promise.all([
    getStoreByOwner(u.id),
    adminListListings({ userId: u.id, page: 1, status: "" }),
    can(actor.role, "audit.view") ? listAudit({ page: 1, actorId: u.id }) : Promise.resolve([]),
  ]);
  const self = actor.id === u.id;
  const canBlock = can(actor.role, "users.block") && !self && outranks(actor.role, u.role);
  const roles = self || !outranks(actor.role, u.role) ? [] : assignableRoles(actor.role).filter(() => assignableRoles(actor.role).includes(u.role));

  const block = async (blocked: boolean, reason: string) => {
    "use server";
    return setUserBlockedAction(u.id, blocked, reason);
  };
  const setRole = async (role: Role) => {
    "use server";
    return setUserRoleAction(u.id, role);
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="text-sm font-semibold text-muted hover:text-ink">
        ← К списку
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="t-1">{u.displayName}</h1>
        <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Активен" : "Заблокирован"}</Badge>
        <Badge tone="ink">{ROLE_RU[u.role]}</Badge>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <APanel title="Профиль">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row k="Email" v={u.email ?? "—"} />
              <Row k="Логин" v={u.username ?? "—"} />
              <Row k="Телефон" v={u.phone ? formatPhone(u.phone) : "—"} />
              <Row k="Telegram" v={u.telegram ? `@${u.telegram}` : "—"} />
              <Row k="Регистрация" v={formatDateTime(u.createdAt, "ru")} />
              <Row k="Последний вход" v={u.lastLoginAt ? formatDateTime(u.lastLoginAt, "ru") : "—"} />
              <Row k="Магазин" v={store ? store.name : "—"} />
              <Row k="Язык" v={u.locale} />
            </dl>
            {u.blockedReason && <p className="mt-3 text-sm text-danger">Причина блокировки: {u.blockedReason}</p>}
          </APanel>
          <APanel title={`Объявления (${userListings.total})`}>
            <ul className="divide-y divide-line text-sm">
              {userListings.items.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/listings/${l.id}`} className="truncate font-medium hover:underline">
                    {l.title || "—"}
                  </Link>
                  <Badge tone={statusTone(l.status)}>{STATUS_RU[l.status]}</Badge>
                </li>
              ))}
              {!userListings.items.length && <li className="py-2 text-muted">Нет объявлений</li>}
            </ul>
          </APanel>
          {actions.length > 0 && (
            <APanel title="Административные действия этого пользователя">
              <ul className="space-y-1.5 text-sm">
                {actions.map(({ log }) => (
                  <li key={log.id}>
                    <span className="text-muted">{formatDateTime(log.createdAt, "ru")}</span> · {log.action} · {log.entityType} {log.entityId}
                  </li>
                ))}
              </ul>
            </APanel>
          )}
        </div>
        <div className="space-y-5">
          {canBlock && (
            <APanel title="Доступ">
              {u.status === "active" ? (
                <ActionButton run={block.bind(null, true)} variant="danger" prompt="Причина блокировки:" promptRequired>
                  Заблокировать
                </ActionButton>
              ) : (
                <ActionButton run={block.bind(null, false)} variant="primary" confirm="Разблокировать пользователя?">
                  Разблокировать
                </ActionButton>
              )}
              <p className="mt-3 text-xs text-muted">Блокировка завершает все сессии пользователя.</p>
            </APanel>
          )}
          {roles.length > 0 && (
            <APanel title="Роль">
              <div className="flex flex-wrap gap-2">
                {roles
                  .filter((r) => r !== u.role)
                  .map((r) => (
                    <ActionButton key={r} run={setRole.bind(null, r)} variant="secondary" confirm={`Назначить роль «${ROLE_RU[r]}»?`}>
                      {ROLE_RU[r]}
                    </ActionButton>
                  ))}
              </div>
              <p className="mt-3 text-xs text-muted">Назначать роли администраторов может только Super Admin. Себе роль изменить нельзя.</p>
            </APanel>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5">
      <dt className="text-muted">{k}</dt>
      <dd className="truncate text-right font-medium">{v}</dd>
    </div>
  );
}

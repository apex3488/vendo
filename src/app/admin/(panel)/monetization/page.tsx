import Link from "next/link";
import {
  activatePromotionAction,
  activateSubscriptionAction,
  cancelPromotionAdminAction,
  cancelSubscriptionAction,
  savePromotionPlanAction,
  saveSubscriptionPlanAction,
} from "@/app/admin/actions";
import { ActionButton, AdminForm } from "@/components/admin/admin-ui";
import { ACheck, AField, AInput, APanel, ASelect, ATable, I18nInputs } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { PAID_RU, statusTone } from "@/lib/admin-labels";
import { tr } from "@/lib/i18n/config";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { listingPath } from "@/lib/slug";
import { requirePermissionPage } from "@/server/auth/current";
import type { promotionPlans, subscriptionPlans } from "@/server/db/schema";
import {
  adminListPromotions,
  adminListSubscriptions,
  getPromotionPlans,
  getSubscriptionPlans,
} from "@/server/services/monetization";

type SubPlan = typeof subscriptionPlans.$inferSelect;
type PromoPlan = typeof promotionPlans.$inferSelect;

function SubPlanFields({ p }: { p?: SubPlan }) {
  return (
    <div className="space-y-3">
      <I18nInputs name="name" label="Название" value={p?.name} required />
      <I18nInputs name="description" label="Описание" value={p?.description} />
      <div className="grid gap-3 md:grid-cols-4">
        <AField label="Код">
          <AInput name="code" defaultValue={p?.code ?? ""} required pattern="[a-z0-9_]{2,40}" />
        </AField>
        <AField label="Цена">
          <AInput name="price" type="number" min={0} defaultValue={p?.price ?? 0} />
        </AField>
        <AField label="Валюта">
          <ASelect name="currency" defaultValue={p?.currency ?? "UZS"}>
            <option>UZS</option>
            <option>USD</option>
          </ASelect>
        </AField>
        <AField label="Период, дней">
          <AInput name="periodDays" type="number" min={1} defaultValue={p?.periodDays ?? 30} />
        </AField>
        <AField label="Лимит объявлений">
          <AInput name="listingLimit" type="number" min={0} defaultValue={p?.listingLimit ?? 20} />
        </AField>
        <AField label="Бесплатных поднятий / мес">
          <AInput name="freeBumpsPerMonth" type="number" min={0} defaultValue={p?.features.freeBumpsPerMonth ?? 0} />
        </AField>
        <AField label="Порядок">
          <AInput name="sort" type="number" defaultValue={p?.sort ?? 0} />
        </AField>
      </div>
      <div className="flex flex-wrap gap-5">
        <ACheck name="storePage" label="Страница магазина" defaultChecked={p?.features.storePage ?? true} />
        <ACheck name="customLogo" label="Логотип" defaultChecked={p?.features.customLogo ?? true} />
        <ACheck name="analytics" label="Расширенная статистика" defaultChecked={p?.features.analytics} />
        <ACheck name="isActive" label="Доступен" defaultChecked={p?.isActive ?? true} />
      </div>
    </div>
  );
}

function PromoPlanFields({ p }: { p?: PromoPlan }) {
  return (
    <div className="space-y-3">
      <I18nInputs name="name" label="Название" value={p?.name} required />
      <I18nInputs name="description" label="Описание" value={p?.description} />
      <div className="grid gap-3 md:grid-cols-4">
        <AField label="Код">
          <AInput name="code" defaultValue={p?.code ?? ""} required pattern="[a-z0-9_]{2,40}" />
        </AField>
        <AField label="Тип">
          <ASelect name="type" defaultValue={p?.type ?? "bump"}>
            <option value="bump">Поднятие</option>
            <option value="highlight">Выделение</option>
            <option value="featured">Подборка «Рекомендуем»</option>
          </ASelect>
        </AField>
        <AField label="Цена">
          <AInput name="price" type="number" min={0} defaultValue={p?.price ?? 0} />
        </AField>
        <AField label="Валюта">
          <ASelect name="currency" defaultValue={p?.currency ?? "UZS"}>
            <option>UZS</option>
            <option>USD</option>
          </ASelect>
        </AField>
        <AField label="Длительность, дней">
          <AInput name="durationDays" type="number" min={1} defaultValue={p?.durationDays ?? 7} />
        </AField>
        <AField label="ID категорий (пусто = все)" hint="через запятую">
          <AInput name="categoryIds" defaultValue={p?.categoryIds.join(", ") ?? ""} />
        </AField>
        <AField label="Порядок">
          <AInput name="sort" type="number" defaultValue={p?.sort ?? 0} />
        </AField>
      </div>
      <ACheck name="isActive" label="Доступен" defaultChecked={p?.isActive ?? true} />
    </div>
  );
}

export default async function AdminMonetization() {
  await requirePermissionPage("monetization.manage");
  const [subPlans, promoPlans, promos, subs] = await Promise.all([
    getSubscriptionPlans(false),
    getPromotionPlans(false),
    adminListPromotions(),
    adminListSubscriptions(),
  ]);
  const pendingPromos = promos.filter((p) => p.promo.status === "pending_payment");
  const pendingSubs = subs.filter((s) => s.sub.status === "pending_payment");

  return (
    <div className="space-y-6">
      <h1 className="t-1">Монетизация</h1>
      <div className="rounded-[var(--radius-lg)] bg-warn-soft p-4 text-sm text-warn">
        Онлайн-оплата не подключена. Заявки создаются со статусом «Ожидает оплаты» и активируются здесь только после того, как оплата
        действительно получена (например, банковским переводом). Каждая активация записывается в журнал с вашим комментарием.
      </div>

      <APanel title={`Заявки на продвижение — ожидают оплаты (${pendingPromos.length})`}>
        <ATable head={["Объявление", "Пользователь", "Тариф", "Сумма", "Создана", ""]}>
          {pendingPromos.map((p) => {
            const activate = async (note: string) => {
              "use server";
              return activatePromotionAction(p.promo.id, note);
            };
            const cancel = async () => {
              "use server";
              return cancelPromotionAdminAction(p.promo.id);
            };
            return (
              <tr key={p.promo.id}>
                <td className="px-4 py-2.5">
                  <Link href={listingPath({ id: p.promo.listingId, slug: p.slug })} target="_blank" className="font-semibold hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{p.userName}</td>
                <td className="px-4 py-2.5">{tr(p.plan.name, "ru")}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{formatMoney(p.plan.price, p.plan.currency, "ru")}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(p.promo.createdAt, "ru")}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <ActionButton run={activate} variant="accent" prompt="Подтверждение оплаты (номер платежа, способ, сумма):" promptRequired>
                      Оплата получена
                    </ActionButton>
                    <ActionButton run={cancel} variant="ghost" confirm="Отменить заявку?">
                      Отменить
                    </ActionButton>
                  </div>
                </td>
              </tr>
            );
          })}
          {!pendingPromos.length && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted">
                Нет заявок
              </td>
            </tr>
          )}
        </ATable>
      </APanel>

      <APanel title={`Заявки на подписку — ожидают оплаты (${pendingSubs.length})`}>
        <ATable head={["Магазин", "Тариф", "Сумма", "Создана", ""]}>
          {pendingSubs.map((s) => {
            const activate = async (note: string) => {
              "use server";
              return activateSubscriptionAction(s.sub.id, note);
            };
            const cancel = async () => {
              "use server";
              return cancelSubscriptionAction(s.sub.id);
            };
            return (
              <tr key={s.sub.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/store/${s.storeSlug}`} target="_blank" className="font-semibold hover:underline">
                    {s.storeName}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{tr(s.plan.name, "ru")}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{formatMoney(s.plan.price, s.plan.currency, "ru")}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(s.sub.createdAt, "ru")}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <ActionButton run={activate} variant="accent" prompt="Подтверждение оплаты (номер платежа, способ, сумма):" promptRequired>
                      Оплата получена
                    </ActionButton>
                    <ActionButton run={cancel} variant="ghost" confirm="Отменить заявку?">
                      Отменить
                    </ActionButton>
                  </div>
                </td>
              </tr>
            );
          })}
          {!pendingSubs.length && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted">
                Нет заявок
              </td>
            </tr>
          )}
        </ATable>
      </APanel>

      <APanel title="Активные и прошлые продвижения / подписки">
        <ul className="divide-y divide-line text-sm">
          {promos
            .filter((p) => p.promo.status !== "pending_payment")
            .slice(0, 30)
            .map((p) => (
              <li key={`p${p.promo.id}`} className="flex flex-wrap items-center gap-2 py-2">
                <Badge tone={statusTone(p.promo.status)}>{PAID_RU[p.promo.status]}</Badge>
                <span className="font-medium">{p.title}</span>
                <span className="text-muted">· {tr(p.plan.name, "ru")}</span>
                {p.promo.endsAt && <span className="text-muted">· до {formatDate(p.promo.endsAt, "ru")}</span>}
              </li>
            ))}
          {subs
            .filter((s) => s.sub.status !== "pending_payment")
            .slice(0, 30)
            .map((s) => (
              <li key={`s${s.sub.id}`} className="flex flex-wrap items-center gap-2 py-2">
                <Badge tone={statusTone(s.sub.status)}>{PAID_RU[s.sub.status]}</Badge>
                <span className="font-medium">{s.storeName}</span>
                <span className="text-muted">· {tr(s.plan.name, "ru")}</span>
                {s.sub.endsAt && <span className="text-muted">· до {formatDate(s.sub.endsAt, "ru")}</span>}
              </li>
            ))}
        </ul>
      </APanel>

      <APanel title="Тарифы магазинов">
        <div className="space-y-3">
          {subPlans.map((p) => (
            <details key={p.id} className="rounded-[12px] border border-line">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <b>{tr(p.name, "ru")}</b>
                <span className="text-muted">
                  {p.price > 0 ? formatMoney(p.price, p.currency, "ru") : "бесплатно"} · {p.listingLimit} объявл. · {p.periodDays} дн.
                </span>
                {!p.isActive && <Badge tone="warn">скрыт</Badge>}
              </summary>
              <div className="border-t border-line p-4">
                <AdminForm action={saveSubscriptionPlanAction.bind(null, p.id)}>
                  <SubPlanFields p={p} />
                </AdminForm>
              </div>
            </details>
          ))}
          <details className="rounded-[12px] border border-dashed border-line-strong">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новый тариф</summary>
            <div className="border-t border-line p-4">
              <AdminForm action={saveSubscriptionPlanAction.bind(null, null)} submitLabel="Создать">
                <SubPlanFields />
              </AdminForm>
            </div>
          </details>
        </div>
        <p className="mt-3 text-xs text-muted">
          Лимит бесплатных объявлений для пользователей без магазина задаётся в разделе «Настройки».
        </p>
      </APanel>

      <APanel title="Тарифы продвижения">
        <div className="space-y-3">
          {promoPlans.map((p) => (
            <details key={p.id} className="rounded-[12px] border border-line">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <b>{tr(p.name, "ru")}</b>
                <span className="text-muted">
                  {formatMoney(p.price, p.currency, "ru")} · {p.durationDays} дн.
                </span>
                {!p.isActive && <Badge tone="warn">скрыт</Badge>}
              </summary>
              <div className="border-t border-line p-4">
                <AdminForm action={savePromotionPlanAction.bind(null, p.id)}>
                  <PromoPlanFields p={p} />
                </AdminForm>
              </div>
            </details>
          ))}
          <details className="rounded-[12px] border border-dashed border-line-strong">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новый тариф продвижения</summary>
            <div className="border-t border-line p-4">
              <AdminForm action={savePromotionPlanAction.bind(null, null)} submitLabel="Создать">
                <PromoPlanFields />
              </AdminForm>
            </div>
          </details>
        </div>
      </APanel>
    </div>
  );
}

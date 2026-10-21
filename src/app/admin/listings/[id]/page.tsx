import Link from "next/link";
import { notFound } from "next/navigation";
import { moderateListingAction } from "../../actions";
import { ActionButton } from "@/components/admin/admin-ui";
import { APanel } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { STATUS_RU, statusTone } from "@/lib/admin-labels";
import { formatPhone } from "@/lib/contacts";
import { formatDateTime, formatNumber } from "@/lib/format";
import { tr } from "@/lib/i18n/config";
import { formatListingPrice } from "@/lib/listing-format";
import { getDict } from "@/lib/i18n/server";
import { listingPath } from "@/lib/slug";
import { requirePermissionPage } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { getCategoryWithAncestors } from "@/server/services/categories";
import { getListingAttributesView, getListingById, getListingImages, getStatusHistory } from "@/server/services/listings";
import { adminGetUser } from "@/server/services/users";
import { mediaUrl } from "@/server/storage";

export default async function AdminListingDetail({ params }: PageProps<"/admin/listings/[id]">) {
  const actor = await requirePermissionPage("listings.view_all");
  const id = Number((await params).id);
  const l = Number.isSafeInteger(id) ? await getListingById(id) : null;
  if (!l) notFound();
  const [images, attrs, chain, author, history] = await Promise.all([
    getListingImages(l.id),
    getListingAttributesView(l.id),
    getCategoryWithAncestors(l.categoryId),
    adminGetUser(l.userId),
    getStatusHistory(l.id),
  ]);
  const t = getDict("ru");
  const canModerate = can(actor.role, "listings.moderate");
  const decide = async (decision: "approve" | "reject" | "block" | "unpublish", reason: string) => {
    "use server";
    return moderateListingAction(l.id, decision, reason);
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/listings" className="text-sm font-semibold text-muted hover:text-ink">
        ← К списку
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-1">{l.title || "—"}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={statusTone(l.status)}>{STATUS_RU[l.status]}</Badge>
            ID {l.id} · {chain.map((c) => tr(c.name, "ru")).join(" › ")}
          </p>
        </div>
        <Link href={listingPath(l)} target="_blank" className="text-sm font-semibold underline">
          Открыть на сайте ↗
        </Link>
      </div>

      {canModerate && (
        <APanel title="Модерация">
          <div className="flex flex-wrap gap-2">
            {["pending", "rejected", "blocked"].includes(l.status) && (
              <ActionButton run={decide.bind(null, "approve")} variant="accent" confirm="Одобрить и опубликовать объявление?">
                Одобрить
              </ActionButton>
            )}
            {["pending", "active"].includes(l.status) && (
              <ActionButton run={decide.bind(null, "reject")} variant="secondary" prompt="Причина отклонения (увидит автор):" promptRequired>
                Отклонить
              </ActionButton>
            )}
            {l.status === "active" && (
              <ActionButton run={decide.bind(null, "unpublish")} variant="secondary" confirm="Снять объявление с публикации?">
                Снять с публикации
              </ActionButton>
            )}
            {l.status !== "blocked" && (
              <ActionButton run={decide.bind(null, "block")} variant="danger" prompt="Причина блокировки (нарушение правил):" promptRequired>
                Заблокировать
              </ActionButton>
            )}
          </div>
          {l.rejectionReason && <p className="mt-3 text-sm text-danger">Текущая причина: {l.rejectionReason}</p>}
        </APanel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <APanel title={`Фотографии (${images.length})`}>
            {images.length ? (
              <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                {images.map((i) => (
                  <a key={i.id} href={mediaUrl(i.storageKey)!} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(i.thumbKey)!} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Без фото</p>
            )}
          </APanel>
          <APanel title="Описание">
            <p className="whitespace-pre-line text-sm leading-relaxed">{l.description || "—"}</p>
          </APanel>
          <APanel title="Характеристики">
            <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
              {attrs.map((a, i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-line py-2">
                  <dt className="text-muted">{tr(a.label, "ru")}</dt>
                  <dd className="text-right font-medium">
                    {a.optionLabel ? tr(a.optionLabel, "ru") : a.valueNumber != null ? formatNumber(a.valueNumber, "ru") : a.valueBool ? "Да" : (a.valueText ?? a.valueDate ?? "")}
                  </dd>
                </div>
              ))}
              {!attrs.length && <p className="text-muted">Не заполнены</p>}
            </dl>
          </APanel>
        </div>
        <div className="space-y-5">
          <APanel title="Данные">
            <dl className="space-y-2 text-sm">
              <Row k="Цена" v={formatListingPrice(l, t, "ru")} />
              <Row k="Тип" v={l.type} />
              <Row k="Телефон" v={l.phone ? formatPhone(l.phone) : "—"} />
              <Row k="Telegram" v={l.telegram ? `@${l.telegram}` : "—"} />
              <Row k="Создано" v={formatDateTime(l.createdAt, "ru")} />
              <Row k="Опубликовано" v={l.publishedAt ? formatDateTime(l.publishedAt, "ru") : "—"} />
              <Row k="Просмотры" v={String(l.viewsCount)} />
            </dl>
          </APanel>
          {author && (
            <APanel title="Автор">
              <Link href={`/admin/users/${author.id}`} className="font-semibold hover:underline">
                {author.displayName}
              </Link>
              <p className="text-sm text-muted">{author.email ?? author.username}</p>
              <p className="mt-1 text-sm">{author.status === "blocked" ? <Badge tone="danger">Заблокирован</Badge> : <Badge tone="success">Активен</Badge>}</p>
            </APanel>
          )}
          <APanel title="История статусов">
            <ol className="space-y-3 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  <p>
                    {h.fromStatus ? STATUS_RU[h.fromStatus] : "—"} → <b>{STATUS_RU[h.toStatus]}</b>
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(h.createdAt, "ru")} · {h.actorName ?? "система"}
                  </p>
                  {h.reason && <p className="text-xs text-ink-2">{h.reason}</p>}
                </li>
              ))}
            </ol>
          </APanel>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

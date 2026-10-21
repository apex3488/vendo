import Link from "next/link";
import { deleteCollectionAction, deletePageAction, saveCollectionAction, savePageAction } from "@/app/admin/actions";
import { ActionButton, AdminForm } from "@/components/admin/admin-ui";
import { ACheck, AField, AInput, APanel, ASelect, I18nInputs } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { requirePermissionPage } from "@/server/auth/current";
import type { contentPages, homeCollections } from "@/server/db/schema";
import { getHomeCollections, listPages } from "@/server/services/content";

type Page = typeof contentPages.$inferSelect;
type Collection = typeof homeCollections.$inferSelect;

function PageFields({ p }: { p?: Page }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <AField label="Slug" hint="адрес: /p/slug">
          <AInput name="slug" defaultValue={p?.slug ?? ""} required pattern="[a-z0-9-]{2,80}" />
        </AField>
        <AField label="Тип">
          <ASelect name="kind" defaultValue={p?.kind ?? "page"}>
            <option value="page">Страница</option>
            <option value="faq">Вопрос FAQ</option>
          </ASelect>
        </AField>
        <AField label="Порядок">
          <AInput name="sort" type="number" defaultValue={p?.sort ?? 0} />
        </AField>
        <div className="flex items-end pb-2">
          <ACheck name="isPublished" label="Опубликовано" defaultChecked={p?.isPublished ?? true} />
        </div>
      </div>
      <I18nInputs name="title" label="Заголовок" value={p?.title} required />
      <I18nInputs name="body" label="Текст" value={p?.body} textarea rows={8} />
      <p className="text-xs text-muted">Разметка: пустая строка — новый абзац, «## » — подзаголовок, «- » — пункт списка. HTML не поддерживается.</p>
    </div>
  );
}

function CollectionFields({ c }: { c?: Collection }) {
  return (
    <div className="space-y-3">
      <I18nInputs name="title" label="Заголовок" value={c?.title} required />
      <div className="grid gap-3 md:grid-cols-4">
        <AField label="Код">
          <AInput name="code" defaultValue={c?.code ?? ""} required pattern="[a-z0-9_]{2,40}" />
        </AField>
        <AField label="Категория (slug)">
          <AInput name="categorySlug" defaultValue={c?.filter.categorySlug ?? ""} />
        </AField>
        <AField label="Тип">
          <ASelect name="type" defaultValue={c?.filter.type ?? ""}>
            <option value="">Любой</option>
            <option value="sale">Продажа</option>
            <option value="rent">Аренда</option>
            <option value="service">Услуга</option>
          </ASelect>
        </AField>
        <AField label="Сортировка">
          <ASelect name="sortOrder" defaultValue={c?.filter.sort ?? "new"}>
            <option value="new">Новые</option>
            <option value="popular">Популярные</option>
            <option value="price_asc">Дешевле</option>
            <option value="price_desc">Дороже</option>
          </ASelect>
        </AField>
        <AField label="Макс. цена">
          <AInput name="maxPrice" type="number" defaultValue={c?.filter.maxPrice ?? ""} />
        </AField>
        <AField label="Поисковый запрос">
          <AInput name="q" defaultValue={c?.filter.q ?? ""} />
        </AField>
        <AField label="Порядок">
          <AInput name="sort" type="number" defaultValue={c?.sort ?? 0} />
        </AField>
        <div className="flex items-end pb-2">
          <ACheck name="isActive" label="Показывать" defaultChecked={c?.isActive ?? true} />
        </div>
      </div>
    </div>
  );
}

export default async function AdminContent() {
  await requirePermissionPage("content.manage");
  const [pages, collections] = await Promise.all([listPages(), getHomeCollections(false)]);
  return (
    <div className="space-y-6">
      <h1 className="t-1">Контент</h1>
      <APanel title="Страницы и FAQ">
        <div className="space-y-3">
          {pages.map((p) => {
            const del = async () => {
              "use server";
              return deletePageAction(p.id);
            };
            return (
              <details key={p.id} className="rounded-[12px] border border-line">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <b>{tr(p.title, "ru")}</b>
                  <span className="text-muted">/p/{p.slug}</span>
                  <Badge>{p.kind === "faq" ? "FAQ" : "страница"}</Badge>
                  {!p.isPublished && <Badge tone="warn">скрыта</Badge>}
                  {p.kind === "page" && (
                    <Link href={`/p/${p.slug}`} target="_blank" className="ml-auto text-xs font-semibold underline">
                      открыть ↗
                    </Link>
                  )}
                </summary>
                <div className="space-y-3 border-t border-line p-4">
                  <AdminForm action={savePageAction.bind(null, p.id)}>
                    <PageFields p={p} />
                  </AdminForm>
                  <ActionButton run={del} variant="danger" confirm="Удалить страницу?">
                    Удалить
                  </ActionButton>
                </div>
              </details>
            );
          })}
          <details className="rounded-[12px] border border-dashed border-line-strong">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новая страница / вопрос</summary>
            <div className="border-t border-line p-4">
              <AdminForm action={savePageAction.bind(null, null)} submitLabel="Создать">
                <PageFields />
              </AdminForm>
            </div>
          </details>
        </div>
      </APanel>
      <APanel title="Подборки на главной">
        <div className="space-y-3">
          {collections.map((c) => {
            const del = async () => {
              "use server";
              return deleteCollectionAction(c.id);
            };
            return (
              <details key={c.id} className="rounded-[12px] border border-line">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <b>{tr(c.title, "ru")}</b>
                  <span className="text-muted">{c.code}</span>
                  {!c.isActive && <Badge tone="warn">скрыта</Badge>}
                </summary>
                <div className="space-y-3 border-t border-line p-4">
                  <AdminForm action={saveCollectionAction.bind(null, c.id)}>
                    <CollectionFields c={c} />
                  </AdminForm>
                  <ActionButton run={del} variant="danger" confirm="Удалить подборку?">
                    Удалить
                  </ActionButton>
                </div>
              </details>
            );
          })}
          <details className="rounded-[12px] border border-dashed border-line-strong">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новая подборка</summary>
            <div className="border-t border-line p-4">
              <AdminForm action={saveCollectionAction.bind(null, null)} submitLabel="Создать">
                <CollectionFields />
              </AdminForm>
            </div>
          </details>
        </div>
        <p className="mt-3 text-xs text-muted">Подборки без подходящих объявлений на главной не показываются.</p>
      </APanel>
    </div>
  );
}

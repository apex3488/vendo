import Link from "next/link";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { addOptionAction, deleteAttributeAction, deleteCategoryAction, deleteOptionAction, saveAttributeAction, saveCategoryAction } from "../../actions";
import { ActionButton, AdminForm } from "@/components/admin/admin-ui";
import { CategoryFields } from "@/components/admin/category-form";
import { ACheck, AField, AInput, APanel, ASelect, I18nInputs } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { requirePermissionPage } from "@/server/auth/current";
import { getDb } from "@/server/db";
import { listings } from "@/server/db/schema";
import { getAllCategories, getAttributesForCategory, type Attribute } from "@/server/services/categories";

const TYPES: [string, string][] = [
  ["text", "Текст"],
  ["number", "Число"],
  ["select", "Список (один)"],
  ["multiselect", "Список (несколько)"],
  ["boolean", "Да/нет"],
  ["date", "Дата"],
];

function AttributeFields({ a }: { a?: Attribute }) {
  return (
    <div className="space-y-3">
      <I18nInputs name="label" label="Название" value={a?.label} required />
      <div className="grid gap-3 md:grid-cols-4">
        <AField label="Ключ" hint="a-z, 0-9, _">
          <AInput name="key" defaultValue={a?.key ?? ""} required pattern="[a-z][a-z0-9_]*" />
        </AField>
        <AField label="Тип">
          <ASelect name="type" defaultValue={a?.type ?? "text"}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </ASelect>
        </AField>
        <AField label="Ед. изм.">
          <AInput name="unit" defaultValue={a?.unit ?? ""} />
        </AField>
        <AField label="Порядок">
          <AInput name="sort" type="number" defaultValue={a?.sort ?? 0} />
        </AField>
        <AField label="Мин.">
          <AInput name="minValue" type="number" step="any" defaultValue={a?.minValue ?? ""} />
        </AField>
        <AField label="Макс.">
          <AInput name="maxValue" type="number" step="any" defaultValue={a?.maxValue ?? ""} />
        </AField>
        <AField label="Макс. длина текста">
          <AInput name="maxLength" type="number" defaultValue={a?.maxLength ?? ""} />
        </AField>
      </div>
      <div className="flex gap-6">
        <ACheck name="isRequired" label="Обязательная" defaultChecked={a?.isRequired} />
        <ACheck name="isFilterable" label="Фильтр в поиске" defaultChecked={a?.isFilterable} />
      </div>
    </div>
  );
}

export default async function AdminCategoryEdit({ params }: PageProps<"/admin/categories/[id]">) {
  await requirePermissionPage("categories.manage");
  const id = Number((await params).id);
  const all = await getAllCategories();
  const cat = all.find((c) => c.id === id);
  if (!cat) notFound();
  const attrs = await getAttributesForCategory(cat.id);
  const own = attrs.filter((a) => a.categoryId === cat.id);
  const inherited = attrs.filter((a) => a.categoryId !== cat.id);
  const db = await getDb();
  const [used] = await db.select({ n: count() }).from(listings).where(eq(listings.categoryId, cat.id));
  const children = all.filter((c) => c.parentId === cat.id);

  const remove = async (moveTo: string) => {
    "use server";
    return deleteCategoryAction(cat.id, moveTo ? Number(moveTo) : null);
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/categories" className="text-sm font-semibold text-muted hover:text-ink">
        ← Все категории
      </Link>
      <h1 className="t-1">{tr(cat.name, "ru")}</h1>

      <APanel title="Основное">
        <AdminForm action={saveCategoryAction.bind(null, cat.id)}>
          <CategoryFields category={cat} all={all} />
        </AdminForm>
      </APanel>

      <APanel title={`Характеристики (${own.length})`}>
        {inherited.length > 0 && (
          <p className="mb-4 text-sm text-muted">
            Наследуются от родительских категорий: {inherited.map((a) => tr(a.label, "ru")).join(", ")}
          </p>
        )}
        <div className="space-y-4">
          {own.map((a) => {
            const delAttr = async () => {
              "use server";
              return deleteAttributeAction(cat.id, a.id);
            };
            return (
              <details key={a.id} className="rounded-[12px] border border-line">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <b>{tr(a.label, "ru")}</b>
                  <span className="text-muted">{a.key}</span>
                  <Badge>{TYPES.find(([v]) => v === a.type)?.[1]}</Badge>
                  {a.isRequired && <Badge tone="warn">обязательная</Badge>}
                  {a.isFilterable && <Badge tone="lime">фильтр</Badge>}
                </summary>
                <div className="space-y-4 border-t border-line p-4">
                  <AdminForm action={saveAttributeAction.bind(null, cat.id, a.id)}>
                    <AttributeFields a={a} />
                  </AdminForm>
                  {(a.type === "select" || a.type === "multiselect") && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Варианты ({a.options.length})</p>
                      <ul className="mb-3 flex flex-wrap gap-2">
                        {a.options.map((o) => {
                          const delOpt = async () => {
                            "use server";
                            return deleteOptionAction(cat.id, o.id);
                          };
                          return (
                            <li key={o.id} className="flex items-center gap-1 rounded-full bg-soft py-1 pl-3 pr-1 text-sm">
                              {tr(o.label, "ru")} <span className="text-xs text-subtle">{o.value}</span>
                              <ActionButton run={delOpt} variant="ghost" confirm="Удалить вариант? Значения в объявлениях будут удалены." className="h-6 px-2">
                                ×
                              </ActionButton>
                            </li>
                          );
                        })}
                      </ul>
                      <AdminForm action={addOptionAction.bind(null, cat.id, a.id)} submitLabel="Добавить вариант">
                        <I18nInputs name="label" label="Вариант" required />
                      </AdminForm>
                    </div>
                  )}
                  <ActionButton run={delAttr} variant="danger" confirm="Удалить характеристику и все её значения в объявлениях?">
                    Удалить характеристику
                  </ActionButton>
                </div>
              </details>
            );
          })}
        </div>
        <details className="mt-5 rounded-[12px] border border-dashed border-line-strong">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новая характеристика</summary>
          <div className="border-t border-line p-4">
            <AdminForm action={saveAttributeAction.bind(null, cat.id, null)} submitLabel="Добавить">
              <AttributeFields />
            </AdminForm>
          </div>
        </details>
      </APanel>

      <APanel title="Удаление">
        {children.length > 0 ? (
          <p className="text-sm text-muted">Нельзя удалить: есть подкатегории ({children.length}). Удалите или перенесите их, либо скройте категорию.</p>
        ) : (used?.n ?? 0) > 0 ? (
          <div className="space-y-3 text-sm">
            <p>
              В категории <b>{used?.n}</b> объявлений. При удалении они будут перенесены в выбранную категорию. Вместо удаления можно скрыть категорию (снять «Активна»).
            </p>
            <p className="text-muted">ID категории для переноса (например, {all.find((c) => c.id !== cat.id && !all.some((x) => x.parentId === c.id))?.id}):</p>
            <ActionButton run={remove} variant="danger" prompt="Введите ID категории, куда перенести объявления:" promptRequired>
              Перенести объявления и удалить
            </ActionButton>
          </div>
        ) : (
          <ActionButton run={remove} variant="danger" confirm="Удалить категорию безвозвратно?">
            Удалить категорию
          </ActionButton>
        )}
      </APanel>
    </div>
  );
}

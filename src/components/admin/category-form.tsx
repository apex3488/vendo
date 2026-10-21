import { CATEGORY_ICONS } from "../category-icon";
import type { Category } from "@/server/services/categories";
import { tr } from "@/lib/i18n/config";
import { ACheck, AField, AInput, ASelect, I18nInputs } from "./fields";

/** Server-rendered category fields (used inside AdminForm). */
export function CategoryFields({ category, all }: { category?: Category; all: Category[] }) {
  const parents = all.filter((c) => c.id !== category?.id);
  return (
    <div className="space-y-4">
      <I18nInputs name="name" label="Название" value={category?.name} required />
      <div className="grid gap-3 md:grid-cols-4">
        <AField label="Родитель">
          <ASelect name="parentId" defaultValue={category?.parentId ?? ""}>
            <option value="">— корневая —</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {tr(c.name, "ru")}
              </option>
            ))}
          </ASelect>
        </AField>
        <AField label="Slug (URL)" hint="латиница, цифры, дефис">
          <AInput name="slug" defaultValue={category?.slug ?? ""} pattern="[a-z0-9-]*" />
        </AField>
        <AField label="Иконка">
          <ASelect name="icon" defaultValue={category?.icon ?? ""}>
            <option value="">—</option>
            {Object.keys(CATEGORY_ICONS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </ASelect>
        </AField>
        <AField label="Порядок">
          <AInput name="sort" type="number" defaultValue={category?.sort ?? 0} />
        </AField>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <ACheck name="isActive" label="Активна" defaultChecked={category?.isActive ?? true} />
        <ACheck name="hasCondition" label="Есть поле «Состояние»" defaultChecked={category?.hasCondition ?? true} />
        <ACheck name="highValue" label="Дорогостоящая (доп. предупреждение)" defaultChecked={category?.highValue ?? false} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Типы объявлений:</span>
        <ACheck name="allowedTypes" value="sale" label="Продажа" defaultChecked={category ? category.allowedTypes.includes("sale") : true} />
        <ACheck name="allowedTypes" value="rent" label="Аренда" defaultChecked={category?.allowedTypes.includes("rent")} />
        <ACheck name="allowedTypes" value="service" label="Услуга" defaultChecked={category?.allowedTypes.includes("service")} />
      </div>
      <details className="rounded-[10px] border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">SEO</summary>
        <div className="mt-3 space-y-3">
          <I18nInputs name="seoTitle" label="SEO title" value={category?.seoTitle} />
          <I18nInputs name="seoDescription" label="SEO description" value={category?.seoDescription} />
        </div>
      </details>
    </div>
  );
}

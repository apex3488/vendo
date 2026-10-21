import { saveCampaignAction, savePlacementAction } from "../actions";
import { AdminForm } from "@/components/admin/admin-ui";
import { ACheck, AField, AInput, APanel, ASelect } from "@/components/admin/fields";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import { requirePermissionPage } from "@/server/auth/current";
import type { adCampaigns, adPlacements } from "@/server/db/schema";
import { getAllCategories, type Category } from "@/server/services/categories";
import { getAdPlacements, listCampaigns } from "@/server/services/monetization";
import { mediaUrl } from "@/server/storage";

type Placement = typeof adPlacements.$inferSelect;
type Campaign = typeof adCampaigns.$inferSelect;

const STATUS: Record<string, string> = { draft: "Черновик", active: "Активна", paused: "Пауза", ended: "Завершена" };
const toLocal = (d?: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function PlacementFields({ p }: { p?: Placement }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <AField label="Код">
        <AInput name="code" defaultValue={p?.code ?? ""} required pattern="[a-z0-9_]{2,40}" />
      </AField>
      <AField label="Название">
        <AInput name="name" defaultValue={p?.name ?? ""} required />
      </AField>
      <AField label="Описание">
        <AInput name="description" defaultValue={p?.description ?? ""} />
      </AField>
      <AField label="Ширина, px">
        <AInput name="width" type="number" defaultValue={p?.width ?? 1200} required />
      </AField>
      <AField label="Высота, px">
        <AInput name="height" type="number" defaultValue={p?.height ?? 200} required />
      </AField>
      <div className="flex items-end pb-2">
        <ACheck name="isActive" label="Активно" defaultChecked={p?.isActive ?? true} />
      </div>
    </div>
  );
}

function CampaignFields({ c, placements, categories }: { c?: Campaign; placements: Placement[]; categories: Category[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <AField label="Рекламное место">
        <ASelect name="placementId" defaultValue={c?.placementId ?? placements[0]?.id}>
          {placements.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.width}×{p.height})
            </option>
          ))}
        </ASelect>
      </AField>
      <AField label="Рекламодатель">
        <AInput name="advertiser" defaultValue={c?.advertiser ?? ""} required />
      </AField>
      <AField label="Заголовок (alt)">
        <AInput name="title" defaultValue={c?.title ?? ""} required />
      </AField>
      <AField label="Ссылка (https://)">
        <AInput name="targetUrl" type="url" defaultValue={c?.targetUrl ?? ""} required pattern="https://.*" />
      </AField>
      <AField label="Категория (таргетинг)">
        <ASelect name="categoryId" defaultValue={c?.categoryId ?? ""}>
          <option value="">Все страницы</option>
          {categories.map((x) => (
            <option key={x.id} value={x.id}>
              {tr(x.name, "ru")}
            </option>
          ))}
        </ASelect>
      </AField>
      <AField label="Статус">
        <ASelect name="status" defaultValue={c?.status ?? "draft"}>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </ASelect>
      </AField>
      <AField label="Начало">
        <AInput name="startsAt" type="datetime-local" defaultValue={toLocal(c?.startsAt)} required />
      </AField>
      <AField label="Окончание">
        <AInput name="endsAt" type="datetime-local" defaultValue={toLocal(c?.endsAt)} required />
      </AField>
      <AField label="Баннер (JPG/PNG/WEBP ≤ 2 МБ)">
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" required={!c} />
      </AField>
    </div>
  );
}

export default async function AdminAds() {
  await requirePermissionPage("ads.manage");
  const [placements, campaigns, categories] = await Promise.all([getAdPlacements(), listCampaigns(), getAllCategories()]);
  return (
    <div className="space-y-6">
      <h1 className="t-1">Реклама</h1>
      <p className="text-sm text-muted">
        Баннеры показываются только в активный период кампании, всегда помечены «Реклама» и визуально отделены от объявлений. Показы и клики
        считаются автоматически.
      </p>
      <APanel title={`Кампании (${campaigns.length})`}>
        <div className="space-y-3">
          {campaigns.map(({ c, placement }) => (
            <details key={c.id} className="rounded-[12px] border border-line">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <b>{c.title}</b>
                <span className="text-muted">
                  {c.advertiser} · {placement} · {formatDate(c.startsAt, "ru")} — {formatDate(c.endsAt, "ru")}
                </span>
                <Badge tone={c.status === "active" ? "success" : "neutral"}>{STATUS[c.status]}</Badge>
                <span className="ml-auto text-muted">
                  показы {c.impressions} · клики {c.clicks} · CTR {c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00"}%
                </span>
              </summary>
              <div className="space-y-3 border-t border-line p-4">
                {c.imageKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(c.imageKey)!} alt="" className="max-h-32 rounded-lg" />
                )}
                <AdminForm action={saveCampaignAction.bind(null, c.id)}>
                  <CampaignFields c={c} placements={placements} categories={categories} />
                </AdminForm>
              </div>
            </details>
          ))}
          {placements.length > 0 && (
            <details className="rounded-[12px] border border-dashed border-line-strong">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новая кампания</summary>
              <div className="border-t border-line p-4">
                <AdminForm action={saveCampaignAction.bind(null, null)} submitLabel="Создать">
                  <CampaignFields placements={placements} categories={categories} />
                </AdminForm>
              </div>
            </details>
          )}
        </div>
      </APanel>
      <APanel title="Рекламные места">
        <div className="space-y-3">
          {placements.map((p) => (
            <details key={p.id} className="rounded-[12px] border border-line">
              <summary className="cursor-pointer px-4 py-3 text-sm">
                <b>{p.name}</b> <span className="text-muted">{p.code} · {p.width}×{p.height}</span> {!p.isActive && <Badge tone="warn">выкл.</Badge>}
              </summary>
              <div className="border-t border-line p-4">
                <AdminForm action={savePlacementAction.bind(null, p.id)}>
                  <PlacementFields p={p} />
                </AdminForm>
              </div>
            </details>
          ))}
          <details className="rounded-[12px] border border-dashed border-line-strong">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ Новое место</summary>
            <div className="border-t border-line p-4">
              <AdminForm action={savePlacementAction.bind(null, null)} submitLabel="Создать">
                <PlacementFields />
              </AdminForm>
            </div>
          </details>
        </div>
        <p className="mt-3 text-xs text-muted">Новое место начнёт показываться только после добавления его кода в шаблон страницы разработчиком.</p>
      </APanel>
    </div>
  );
}

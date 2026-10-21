import { ExternalLink } from "lucide-react";
import { StoreForm } from "@/components/account/forms";
import { LinkButton } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { requireUserPage } from "@/server/auth/current";
import { getRegionsWithCities } from "@/server/services/locations";
import { getStoreByOwner } from "@/server/services/stores";
import { mediaUrl } from "@/server/storage";

export default async function StoreSettingsPage() {
  const user = await requireUserPage("/account/store");
  const [{ locale, t }, store, regions] = await Promise.all([getI18n(), getStoreByOwner(user.id), getRegionsWithCities()]);
  const regionData = regions.map((r) => ({ id: r.id, name: tr(r.name, locale), cities: r.cities.map((c) => ({ id: c.id, name: tr(c.name, locale) })) }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-1 flex items-center gap-3">
          {store ? t.store.edit : t.store.create}
          {store?.verifiedAt && <Badge tone="success">{t.store.verified}</Badge>}
        </h1>
        {store && store.status === "active" && (
          <LinkButton href={`/store/${store.slug}`} variant="secondary" size="sm">
            {t.store.openPage}
            <ExternalLink className="h-4 w-4" />
          </LinkButton>
        )}
      </div>
      {store?.status === "suspended" && <Alert tone="danger">{t.store.suspended}</Alert>}
      {!store && <Alert tone="neutral">{t.store.intro}</Alert>}
      <Card className="p-5 md:p-7">
        <StoreForm store={store} regions={regionData} logoUrl={mediaUrl(store?.logoKey)} />
      </Card>
    </div>
  );
}

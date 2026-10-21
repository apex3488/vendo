import { saveSettingsAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-ui";
import { ACheck, AField, AInput, APanel, ATextarea } from "@/components/admin/fields";
import { requirePermissionPage } from "@/server/auth/current";
import { getSettings } from "@/server/services/settings";

export default async function AdminSettings() {
  await requirePermissionPage("settings.manage");
  const s = await getSettings();
  return (
    <div className="space-y-5">
      <h1 className="t-1">Настройки платформы</h1>
      <APanel title="Публикация и лимиты">
        <AdminForm action={saveSettingsAction}>
          <ACheck name="premoderation" label="Премодерация: новые и изменённые объявления проверяются модератором до публикации" defaultChecked={s.premoderation} />
          <div className="grid gap-3 md:grid-cols-3">
            <AField label="Бесплатный лимит активных объявлений">
              <AInput name="freeActiveListings" type="number" min={0} defaultValue={s.freeActiveListings} />
            </AField>
            <AField label="Объявлений в сутки на пользователя">
              <AInput name="listingsPerDay" type="number" min={1} defaultValue={s.listingsPerDay} />
            </AField>
            <AField label="Срок публикации, дней">
              <AInput name="listingTtlDays" type="number" min={1} defaultValue={s.listingTtlDays} />
            </AField>
            <AField label="Фото на объявление">
              <AInput name="maxImagesPerListing" type="number" min={1} max={30} defaultValue={s.maxImagesPerListing} />
            </AField>
            <AField label="Макс. размер фото, МБ">
              <AInput name="maxImageMb" type="number" min={1} max={15} defaultValue={s.maxImageMb} />
            </AField>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <AField label="Email поддержки (в футере)">
              <AInput name="supportEmail" type="email" defaultValue={s.supportEmail} />
            </AField>
            <AField label="Telegram поддержки (без @)">
              <AInput name="supportTelegram" defaultValue={s.supportTelegram} />
            </AField>
          </div>
          <AField label="Инструкция по оплате для заявок (показывается продавцам)" hint="Например, реквизиты для перевода. Пусто — стандартный текст.">
            <ATextarea name="manualPaymentInstructions" rows={3} defaultValue={s.manualPaymentInstructions} maxLength={1000} />
          </AField>
        </AdminForm>
      </APanel>
      <APanel title="Онлайн-оплата">
        <p className="text-sm text-muted">
          Платёжный провайдер не подключён. Архитектура готова (таблица payments, статусы «Ожидает оплаты» → «Активно»); подключение Payme / Click /
          Uzum описано в ARCHITECTURE.md и требует договора с провайдером.
        </p>
      </APanel>
    </div>
  );
}

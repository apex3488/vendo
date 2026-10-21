import { PasswordForm, ProfileForm } from "@/components/account/forms";
import { Card } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { requireUserPage } from "@/server/auth/current";
import { getRegionsWithCities } from "@/server/services/locations";
import { getProfile } from "@/server/services/users";

export default async function SettingsPage() {
  const user = await requireUserPage("/account/settings");
  const [{ locale, t }, profile, regions] = await Promise.all([getI18n(), getProfile(user.id), getRegionsWithCities()]);
  if (!profile) return null;
  const regionData = regions.map((r) => ({ id: r.id, name: tr(r.name, locale), cities: r.cities.map((c) => ({ id: c.id, name: tr(c.name, locale) })) }));
  return (
    <div className="space-y-6">
      <h1 className="t-1">{t.account.settings}</h1>
      <Card className="p-5 md:p-7">
        <ProfileForm profile={profile} regions={regionData} />
      </Card>
      <Card className="p-5 md:p-7">
        <h2 className="t-3 mb-4">{t.account.changePassword}</h2>
        <PasswordForm />
      </Card>
    </div>
  );
}

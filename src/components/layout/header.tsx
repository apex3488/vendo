import Link from "next/link";
import { cookies } from "next/headers";
import { Heart, Plus } from "lucide-react";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { CITY_COOKIE } from "@/lib/site";
import { getCurrentUser } from "@/server/auth/current";
import { isStaff } from "@/server/auth/permissions";
import { getRootCategories } from "@/server/services/categories";
import { getRegionsWithCities } from "@/server/services/locations";
import { unreadCount } from "@/server/services/notifications";
import { popularQueries } from "@/server/services/search";
import { Logo } from "../logo";
import { LinkButton } from "../ui/button";
import { CityPicker } from "./city-picker";
import { LocalePicker } from "./locale-picker";
import { SearchBox } from "./search-box";
import { UserMenu } from "./user-menu";

export async function getSelectedCityId() {
  const v = Number((await cookies()).get(CITY_COOKIE)?.value);
  return Number.isInteger(v) && v > 0 ? v : null;
}

export async function Header() {
  const [{ locale, t }, user, regions, cityId, roots, popular] = await Promise.all([
    getI18n(),
    getCurrentUser(),
    getRegionsWithCities(),
    getSelectedCityId(),
    getRootCategories(),
    popularQueries(),
  ]);
  const unread = user ? await unreadCount(user.id) : 0;
  const regionData = regions.map((r) => ({
    id: r.id,
    name: tr(r.name, locale),
    cities: r.cities.map((c) => ({ id: c.id, name: tr(c.name, locale) })),
  }));
  const city = regions.flatMap((r) => r.cities).find((c) => c.id === cityId);
  const categories = roots.map((c) => ({ slug: c.slug, name: tr(c.name, locale) }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div className="container-x flex h-16 items-center gap-1.5 sm:gap-3 md:h-[72px] md:gap-5">
        <Logo />
        <div className="min-w-0">
          <CityPicker regions={regionData} selectedId={city?.id ?? null} selectedName={city ? tr(city.name, locale) : null} />
        </div>
        <div className="hidden min-w-0 flex-1 lg:block">
          <SearchBox popular={popular} categories={categories} cityId={city?.id ?? null} compact />
        </div>
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <LocalePicker current={locale} />
          <Link
            href="/account/favorites"
            className="hidden h-10 w-10 place-items-center rounded-[12px] text-ink hover:bg-soft md:grid"
            aria-label={t.nav.favorites}
            title={t.nav.favorites}
          >
            <Heart className="h-5 w-5" strokeWidth={1.8} />
          </Link>
          <UserMenu
            user={user ? { name: user.displayName, isStaff: isStaff(user.role) } : null}
            unread={unread}
          />
          <div className="hidden md:block">
            <LinkButton href="/post" variant="accent" size="sm" className="h-10">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {t.nav.post}
            </LinkButton>
          </div>
        </div>
      </div>
      <div className="container-x pb-3 lg:hidden">
        <SearchBox popular={popular} categories={categories} cityId={city?.id ?? null} compact />
      </div>
    </header>
  );
}

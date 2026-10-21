import { Heart } from "lucide-react";
import { ListingCard, ListingGrid } from "@/components/listing/listing-card";
import { EmptyState } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";
import { requireUserPage } from "@/server/auth/current";
import { getFavoriteCards } from "@/server/services/engagement";

export default async function FavoritesPage() {
  const user = await requireUserPage("/account/favorites");
  const [{ locale, t }, items] = await Promise.all([getI18n(), getFavoriteCards(user.id)]);
  return (
    <div>
      <h1 className="t-1">{t.account.favorites}</h1>
      {items.length ? (
        <ListingGrid className="mt-6 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className={item.status !== "active" ? "opacity-60" : undefined}>
              <ListingCard item={item} t={t} locale={locale} loggedIn />
              {item.status !== "active" && <p className="mt-1.5 text-center text-xs font-semibold text-muted">{t.status[item.status]}</p>}
            </div>
          ))}
        </ListingGrid>
      ) : (
        <EmptyState className="mt-6" icon={<Heart className="h-6 w-6" />} title={t.account.emptyFavorites} text={t.account.emptyFavoritesHint} />
      )}
    </div>
  );
}

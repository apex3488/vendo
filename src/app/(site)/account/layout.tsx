import type { Metadata } from "next";
import { AccountNav } from "@/components/account/account-nav";
import { getI18n } from "@/lib/i18n/server";
import { requireUserPage } from "@/server/auth/current";
import { unreadCount } from "@/server/services/notifications";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  const [{ t }, unread] = await Promise.all([getI18n(), unreadCount(user.id)]);
  return (
    <div className="container-x py-6 md:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-subtle lg:block">{t.account.title}</p>
          <AccountNav unread={unread} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

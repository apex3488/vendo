import Link from "next/link";
import { Bell } from "lucide-react";
import { markNotificationsReadAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { fmt } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatDateTime } from "@/lib/format";
import { requireUserPage } from "@/server/auth/current";
import { listNotifications } from "@/server/services/notifications";

export default async function NotificationsPage() {
  const user = await requireUserPage("/account/notifications");
  const [{ locale, t }, items] = await Promise.all([getI18n(), listNotifications(user.id, 100)]);
  const messages = t.notifications as Record<string, string>;
  const unread = items.some((n) => !n.readAt);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-1">{t.account.notifications}</h1>
        {unread && (
          <form action={markNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="sm">
              {t.account.markAllRead}
            </Button>
          </form>
        )}
      </div>
      {items.length ? (
        <ul className="mt-6 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
          {items.map((n) => {
            const text = fmt(messages[n.type] ?? n.type, n.params);
            return (
              <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-lime-strong"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  {n.link?.startsWith("/") ? (
                    <Link href={n.link} className={`hover:underline ${n.readAt ? "text-ink-2" : "font-semibold"}`}>
                      {text}
                    </Link>
                  ) : (
                    <p className={n.readAt ? "text-ink-2" : "font-semibold"}>{text}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">{formatDateTime(n.createdAt, locale)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState className="mt-6" icon={<Bell className="h-6 w-6" />} title={t.account.noNotifications} />
      )}
    </div>
  );
}

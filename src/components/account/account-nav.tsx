"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, CreditCard, Heart, LayoutGrid, LifeBuoy, ListChecks, Megaphone, Settings, Store } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

export function AccountNav({ unread }: { unread: number }) {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/account", label: t.account.overview, icon: LayoutGrid, exact: true },
    { href: "/account/listings", label: t.account.listings, icon: ListChecks },
    { href: "/account/favorites", label: t.account.favorites, icon: Heart },
    { href: "/account/stats", label: t.account.stats, icon: BarChart3 },
    { href: "/account/promotions", label: t.account.promotions, icon: Megaphone },
    { href: "/account/store", label: t.account.store, icon: Store },
    { href: "/account/subscription", label: t.account.subscription, icon: CreditCard },
    { href: "/account/notifications", label: t.account.notifications, icon: Bell, badge: unread },
    { href: "/account/settings", label: t.account.settings, icon: Settings },
    { href: "/p/help", label: t.account.help, icon: LifeBuoy },
  ];
  return (
    <nav className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0">
      {items.map(({ href, label, icon: Icon, exact, badge }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[15px] font-semibold transition-colors",
              active ? "bg-ink text-white" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-soft lg:bg-transparent lg:ring-0",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-lime" : "text-muted")} strokeWidth={1.9} />
            <span className="flex-1">{label}</span>
            {badge ? <span className="rounded-full bg-danger px-1.5 text-xs font-bold text-white">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

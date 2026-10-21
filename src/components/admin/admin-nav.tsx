"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, FolderTree, Gauge, History, LayoutTemplate, ListChecks, Megaphone, Settings, Store, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminNav({ perms, pending, reports }: { perms: string[]; pending: number; reports: number }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Обзор", icon: Gauge, exact: true, show: true },
    { href: "/admin/listings", label: "Объявления", icon: ListChecks, badge: pending, show: perms.includes("listings.view_all") },
    { href: "/admin/reports", label: "Жалобы", icon: Flag, badge: reports, show: perms.includes("reports.view") },
    { href: "/admin/users", label: "Пользователи", icon: Users, show: perms.includes("users.view") },
    { href: "/admin/categories", label: "Категории", icon: FolderTree, show: perms.includes("categories.manage") },
    { href: "/admin/stores", label: "Магазины", icon: Store, show: perms.includes("stores.manage") },
    { href: "/admin/monetization", label: "Монетизация", icon: Wallet, show: perms.includes("monetization.manage") },
    { href: "/admin/ads", label: "Реклама", icon: Megaphone, show: perms.includes("ads.manage") },
    { href: "/admin/content", label: "Контент", icon: LayoutTemplate, show: perms.includes("content.manage") },
    { href: "/admin/settings", label: "Настройки", icon: Settings, show: perms.includes("settings.manage") },
    { href: "/admin/audit", label: "Журнал действий", icon: History, show: perms.includes("audit.view") },
  ].filter((i) => i.show);
  return (
    <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:pb-4">
      {items.map(({ href, label, icon: Icon, exact, badge }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-semibold",
              active ? "bg-ink text-white" : "text-ink-2 hover:bg-soft",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-lime" : "text-muted")} />
            <span className="flex-1">{label}</span>
            {badge ? <span className={cn("rounded-full px-1.5 text-xs font-bold", active ? "bg-lime text-ink" : "bg-danger text-white")}>{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

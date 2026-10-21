"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Flag, FolderTree, Gauge, History, LayoutTemplate, ListChecks, LogOut, Megaphone, Menu, Settings, Store, Users, Wallet, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/cn";
import { Logo } from "../logo";

type ShellUser = { displayName: string; role: string; roleLabel: string };

function NavLinks({ perms, pending, reports, onNavigate }: { perms: string[]; pending: number; reports: number; onNavigate?: () => void }) {
  const path = usePathname();
  const groups = [
    {
      title: "Работа",
      items: [
        { href: "/admin", label: "Обзор", icon: Gauge, exact: true, show: true },
        { href: "/admin/listings", label: "Модерация", icon: ListChecks, badge: pending, show: perms.includes("listings.view_all") },
        { href: "/admin/reports", label: "Жалобы", icon: Flag, badge: reports, show: perms.includes("reports.view") },
        { href: "/admin/users", label: "Пользователи", icon: Users, show: perms.includes("users.view") },
        { href: "/admin/stores", label: "Магазины", icon: Store, show: perms.includes("stores.manage") },
      ],
    },
    {
      title: "Управление",
      items: [
        { href: "/admin/categories", label: "Категории", icon: FolderTree, show: perms.includes("categories.manage") },
        { href: "/admin/monetization", label: "Монетизация", icon: Wallet, show: perms.includes("monetization.manage") },
        { href: "/admin/ads", label: "Реклама", icon: Megaphone, show: perms.includes("ads.manage") },
        { href: "/admin/content", label: "Контент", icon: LayoutTemplate, show: perms.includes("content.manage") },
        { href: "/admin/settings", label: "Настройки", icon: Settings, show: perms.includes("settings.manage") },
        { href: "/admin/audit", label: "Журнал действий", icon: History, show: perms.includes("audit.view") },
      ],
    },
  ];
  return (
    <nav className="space-y-6 px-3">
      {groups.map((g) => {
        const items = g.items.filter((i) => i.show);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">{g.title}</p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon, exact, badge }) => {
                const active = exact ? path === href : path.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                        active ? "bg-lime text-ink" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", active ? "text-ink" : "text-white/45")} />
                      <span className="flex-1">{label}</span>
                      {badge ? (
                        <span className={cn("min-w-5 rounded-full px-1.5 text-center text-xs font-bold leading-5", active ? "bg-ink text-lime" : "bg-danger text-white")}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserCard({ user }: { user: ShellUser }) {
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-[12px] px-2 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-extrabold uppercase text-ink">{user.displayName.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{user.displayName}</span>
          <span className="block text-xs text-white/50">{user.roleLabel}</span>
        </span>
        <form action={logoutAction}>
          <button type="submit" title="Выйти" aria-label="Выйти" className="grid h-9 w-9 place-items-center rounded-[10px] text-white/50 hover:bg-white/[0.06] hover:text-white">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Admin chrome: dark sidebar on desktop, sticky top bar + slide-in drawer on phones. */
export function AdminShell({ user, perms, pending, reports, children }: { user: ShellUser; perms: string[]; pending: number; reports: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const brand = (
    <span className="flex items-center gap-2 [&_a]:text-white">
      <Logo href="/admin" className="text-[22px]" />
      <span className="rounded-md bg-lime px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">admin</span>
    </span>
  );
  const toSite = (
    <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs font-semibold text-white/55 hover:text-white">
      На сайт <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden bg-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex h-16 items-center justify-between px-5">
          {brand}
          {toSite}
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks perms={perms} pending={pending} reports={reports} />
        </div>
        <UserCard user={user} />
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        {brand}
        <div className="flex items-center gap-1">
          {pending > 0 && (
            <Link href="/admin/listings?status=pending" className="mr-1 rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
              {pending} на модерации
            </Link>
          )}
          <button type="button" onClick={() => setOpen(true)} aria-label="Открыть меню" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-[10px] text-white hover:bg-white/10">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-ink shadow-2xl transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between px-4">
            {brand}
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть меню" className="grid h-10 w-10 place-items-center rounded-[10px] text-white/70 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3">
            <NavLinks perms={perms} pending={pending} reports={reports} onNavigate={() => setOpen(false)} />
            <div className="mt-6 px-6">{toSite}</div>
          </div>
          <UserCard user={user} />
        </aside>
      </div>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}

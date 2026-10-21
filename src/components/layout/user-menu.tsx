"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CircleUser, Heart, LayoutGrid, ListChecks, LogOut, Settings, Shield } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { buttonClass } from "../ui/button";

export function UserMenu({ user, unread }: { user: { name: string; isStaff: boolean } | null; unread: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClass("ghost", "sm", "h-10")}>
        <CircleUser className="h-5 w-5" strokeWidth={1.8} />
        <span className="hidden sm:inline">{t.nav.login}</span>
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const links = [
    { href: "/account", label: t.account.overview, icon: LayoutGrid },
    { href: "/account/listings", label: t.nav.myListings, icon: ListChecks },
    { href: "/account/favorites", label: t.nav.favorites, icon: Heart },
    { href: "/account/notifications", label: t.nav.notifications, icon: Bell, badge: unread },
    { href: "/account/settings", label: t.account.settings, icon: Settings },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.nav.profile}
        className="relative flex h-10 items-center gap-2 rounded-[12px] pl-1 pr-2 hover:bg-soft"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-bold text-lime">{initial}</span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold xl:inline">{user.name}</span>
        {unread > 0 && <span className="absolute left-7 top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 animate-rise rounded-[16px] border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <p className="truncate px-3 pb-2 pt-1.5 text-sm font-semibold">{user.name}</p>
          {links.map(({ href, label, icon: Icon, badge }) => (
            <Link key={href} href={href} role="menuitem" className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] hover:bg-soft">
              <Icon className="h-4 w-4 text-muted" />
              <span className="flex-1">{label}</span>
              {badge ? <span className="rounded-full bg-danger px-1.5 text-xs font-bold text-white">{badge}</span> : null}
            </Link>
          ))}
          {user.isStaff && (
            <Link href="/admin" role="menuitem" className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] hover:bg-soft">
              <Shield className="h-4 w-4 text-muted" />
              {t.nav.admin}
            </Link>
          )}
          <div className="my-1 h-px bg-line" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[15px] hover:bg-soft">
              <LogOut className="h-4 w-4 text-muted" />
              {t.nav.logout}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

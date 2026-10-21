"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Plus, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

/** Bottom tab bar on phones: the primary actions always within thumb reach. */
export function MobileNav() {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/", label: t.nav.home, icon: Home, match: (p: string) => p === "/" },
    { href: "/search", label: t.nav.search, icon: Search, match: (p: string) => p.startsWith("/search") || p.startsWith("/c/") },
    { href: "/post", label: t.nav.postShort, icon: Plus, accent: true, match: (p: string) => p.startsWith("/post") },
    { href: "/account/favorites", label: t.nav.favorites, icon: Heart, match: (p: string) => p.startsWith("/account/favorites") },
    { href: "/account", label: t.nav.profile, icon: User, match: (p: string) => p.startsWith("/account") && !p.startsWith("/account/favorites") },
  ];
  return (
    <nav
      aria-label={t.nav.menu}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map(({ href, label, icon: Icon, accent, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-ink" : "text-muted")}
              >
                {accent ? (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-ink">
                    <Icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                ) : (
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                )}
                {!accent && label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

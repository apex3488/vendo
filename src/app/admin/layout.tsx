import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";
import { requirePermissionPage } from "@/server/auth/current";
import { can, type Permission } from "@/server/auth/permissions";
import { openReportsCount } from "@/server/services/reports";
import { getDb } from "@/server/db";
import { listings } from "@/server/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";

export const metadata: Metadata = { title: { default: "Админ-панель", template: "%s — Админ VENDO" }, robots: { index: false, follow: false } };

const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", admin: "Администратор", moderator: "Модератор", support: "Поддержка" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Users without admin access get a 404: the panel's existence is not revealed.
  const user = await requirePermissionPage("admin.access");
  const db = await getDb();
  const [[pending], reports] = await Promise.all([
    db.select({ n: count() }).from(listings).where(and(eq(listings.status, "pending"), isNull(listings.deletedAt))),
    openReportsCount(),
  ]);
  const perms = (["listings.view_all", "reports.view", "users.view", "categories.manage", "stores.manage", "monetization.manage", "ads.manage", "content.manage", "settings.manage", "audit.view"] as Permission[]).filter((p) => can(user.role, p));
  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5">
          <span className="flex items-center gap-2">
            <Logo href="/admin" className="text-[22px]" />
            <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">admin</span>
          </span>
          <Link href="/" className="text-xs font-semibold text-muted hover:text-ink">
            На сайт →
          </Link>
        </div>
        <AdminNav perms={perms} pending={pending?.n ?? 0} reports={reports} />
        <div className="hidden border-t border-line px-5 py-4 text-sm lg:block">
          <p className="truncate font-semibold">{user.displayName}</p>
          <p className="text-xs text-muted">{ROLE_LABEL[user.role] ?? user.role}</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-nav";
import { ROLE_RU } from "@/lib/admin-labels";
import { requirePermissionPage } from "@/server/auth/current";
import { can, type Permission } from "@/server/auth/permissions";
import { openReportsCount } from "@/server/services/reports";
import { getDb } from "@/server/db";
import { listings } from "@/server/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";

export const metadata: Metadata = { title: { default: "Админ-панель", template: "%s — Админ VENDO" }, robots: { index: false, follow: false } };

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
    <AdminShell user={{ displayName: user.displayName, role: user.role, roleLabel: ROLE_RU[user.role] ?? user.role }} perms={perms} pending={pending?.n ?? 0} reports={reports}>
      {children}
    </AdminShell>
  );
}

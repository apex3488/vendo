import Link from "next/link";
import { count } from "drizzle-orm";
import { saveCategoryAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-ui";
import { CategoryFields } from "@/components/admin/category-form";
import { APanel } from "@/components/admin/fields";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/misc";
import { tr } from "@/lib/i18n/config";
import { requirePermissionPage } from "@/server/auth/current";
import { getDb } from "@/server/db";
import { listings } from "@/server/db/schema";
import { buildTree, getAllCategories, type CategoryNode } from "@/server/services/categories";

export default async function AdminCategories() {
  await requirePermissionPage("categories.manage");
  const all = await getAllCategories();
  const tree = buildTree(all, false);
  const db = await getDb();
  const counts = new Map(
    (await db.select({ id: listings.categoryId, n: count() }).from(listings).groupBy(listings.categoryId)).map((r) => [r.id, r.n]),
  );

  const renderNode = (n: CategoryNode, depth: number): React.ReactNode => (
    <li key={n.id}>
      <div className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-canvas" style={{ paddingLeft: 8 + depth * 22 }}>
        <CategoryIcon name={n.icon} className="h-4 w-4 text-muted" />
        <Link href={`/admin/categories/${n.id}`} className="font-medium hover:underline">
          {tr(n.name, "ru")}
        </Link>
        <span className="text-xs text-subtle">/{n.slug}</span>
        {!n.isActive && <Badge tone="warn">скрыта</Badge>}
        <span className="ml-auto text-xs text-muted">{counts.get(n.id) ?? 0} объявл.</span>
      </div>
      {n.children.length > 0 && <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>}
    </li>
  );

  return (
    <div className="space-y-5">
      <h1 className="t-1">Категории</h1>
      <div className="grid gap-5 xl:grid-cols-[1fr_520px]">
        <APanel title={`Дерево категорий (${all.length})`}>
          <ul className="text-sm">{tree.map((n) => renderNode(n, 0))}</ul>
        </APanel>
        <APanel title="Новая категория">
          <AdminForm action={saveCategoryAction.bind(null, null)} submitLabel="Создать">
            <CategoryFields all={all} />
          </AdminForm>
        </APanel>
      </div>
    </div>
  );
}

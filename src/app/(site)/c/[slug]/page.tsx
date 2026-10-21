import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/search/search-view";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getAttributesForCategory, getCategoryContext } from "@/server/services/categories";

export async function generateMetadata({ params, searchParams }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getCategoryContext(slug);
  if (!ctx) return {};
  const { locale, t } = await getI18n();
  const name = tr(ctx.category.name, locale);
  const title = tr(ctx.category.seoTitle, locale) || name;
  const description = tr(ctx.category.seoDescription, locale) || `${name} — ${t.meta.description}`;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return {
    title,
    description,
    alternates: { canonical: `/c/${slug}` },
    openGraph: { title, description, url: `/c/${slug}` },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const ctx = await getCategoryContext(slug);
  if (!ctx) notFound();
  const attrs = (await getAttributesForCategory(ctx.category.id)).filter((a) => a.isFilterable);
  return (
    <SearchView
      raw={await searchParams}
      basePath={`/c/${slug}`}
      category={ctx.category}
      ancestors={ctx.ancestors}
      subcategories={ctx.children}
      filterAttrs={attrs}
    />
  );
}

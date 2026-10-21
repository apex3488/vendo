import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { fmt } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { t } = await getI18n();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  return {
    title: q ? fmt(t.search.resultsFor, { q }) : t.search.results,
    alternates: { canonical: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
    // Search result permutations are not useful for indexing; categories are the indexable entry points.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  return <SearchView raw={await searchParams} basePath="/search" />;
}
